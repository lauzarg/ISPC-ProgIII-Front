import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  // pasos: credenciales -> otp -> olvidé
  step: 'credentials' | 'otp' | 'forgot' = 'credentials';

  loading = false;
  errorMessage = '';
  infoMessage = '';
  otpUsername = ''; // username para el que se generó el OTP

  loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  otpForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  // --- Paso 1: enviar usuario + password, genera OTP ---
  submitCredentials() {
    if (this.loginForm.invalid) return;

    this.setMessages();
    this.loading = true;

    const { username, password } = this.loginForm.value;

    this.http
      .post('http://localhost:8000/api/login/', { username, password })
      .subscribe({
        next: () => {
          this.loading = false;
          this.otpUsername = username;
          this.step = 'otp';
          this.infoMessage =
            'Se generó un código OTP. Revisá la consola del backend para verlo.';
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage =
            error.error?.error || 'No se pudo iniciar sesión. Verificá los datos.';
        },
      });
  }

  // --- Paso 2: enviar OTP, obtener tokens y navegar ---
  submitOtp() {
    if (this.otpForm.invalid || !this.otpUsername) return;

    this.setMessages();
    this.loading = true;

    const { code } = this.otpForm.value;

    this.http
      .post('http://localhost:8000/api/login/otp/', {
        username: this.otpUsername,
        code,
      })
      .subscribe({
        next: (response: any) => {
          this.loading = false;

          const remember = !!this.loginForm.value.rememberMe;
          this.storeTokens(response, remember);

          this.router.navigate(['/home']);
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage =
            error.error?.error || 'OTP inválido o expirado. Probá nuevamente.';
        },
      });
  }

  // --- Flujo "Olvidé mi contraseña": solo solicitud ---
  submitForgot() {
    if (this.forgotForm.invalid) return;

    this.setMessages();
    this.loading = true;

    const { email } = this.forgotForm.value;

    this.http
      .post('http://localhost:8000/api/password/forgot/', { email })
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          this.infoMessage =
            response.detail ||
            'Si el email existe, se enviaron instrucciones de recuperación (en este ejercicio, se muestran en la consola del backend).';
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'No se pudo procesar la solicitud. Intentá más tarde.';
        },
      });
  }

  goToForgot() {
    this.setMessages();
    this.step = 'forgot';
  }

  backToLogin() {
    this.setMessages();
    this.step = 'credentials';
  }

  private setMessages() {
    this.errorMessage = '';
    this.infoMessage = '';
  }

  private storeTokens(data: any, remember: boolean) {
    const storage = remember ? localStorage : sessionStorage;

    if (data?.access) {
      storage.setItem('access_token', data.access);
    }
    if (data?.refresh) {
      storage.setItem('refresh_token', data.refresh);
    }
  }
}
