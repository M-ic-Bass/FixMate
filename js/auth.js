// FixMate - Authentication JavaScript

class AuthManager {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    getCSRFToken() {
        const csrfToken = document.querySelector('meta[name="csrf-token"]');
        if (csrfToken) {
            return csrfToken.getAttribute('content');
        }
        const csrfCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='));
        return csrfCookie ? csrfCookie.split('=')[1] : null;
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        const csrfToken = this.getCSRFToken();
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }
        return headers;
    }

    init() {
        this.setupEventListeners();
        this.checkURLParams();
        this.setupMobileMenu();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form-element');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form
        const registerForm = document.getElementById('register-form-element');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // User type change for provider and admin fields
        const userTypeSelect = document.getElementById('register-user-type');
        if (userTypeSelect) {
            userTypeSelect.addEventListener('change', (e) => {
                this.toggleProviderFields(e.target.value === 'provider');
                this.toggleAdminFields(e.target.value === 'admin');
            });
        }

        // Real-time validation
        this.setupRealTimeValidation();
    }

    setupMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');

        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                hamburger.classList.toggle('active');
            });
        }
    }

    checkURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('register') === 'true') {
            switchTab('register');
        }
    }

    setupRealTimeValidation() {
        // Email validation
        const emailInputs = ['login-email', 'register-email'];
        emailInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('blur', () => {
                    this.validateEmail(inputId);
                });
            }
        });

        // Password validation
        const passwordInputs = ['login-password', 'register-password'];
        passwordInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('blur', () => {
                    this.validatePassword(inputId);
                });
            }
        });

        // Confirm password validation
        const confirmPasswordInput = document.getElementById('register-confirm-password');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('blur', () => {
                this.validateConfirmPassword();
            });
        }

        // Phone validation
        const phoneInput = document.getElementById('register-phone');
        if (phoneInput) {
            phoneInput.addEventListener('blur', () => {
                this.validatePhone();
            });
        }
    }

    toggleProviderFields(show) {
        const providerFields = document.getElementById('provider-fields');
        const businessNameInput = document.getElementById('register-business-name');
        
        if (providerFields) {
            providerFields.style.display = show ? 'block' : 'none';
        }
        
        if (businessNameInput) {
            businessNameInput.required = show;
        }
    }

    toggleAdminFields(show) {
        const adminFields = document.getElementById('admin-fields');
        const adminRoleInput = document.getElementById('register-admin-role');
        const departmentInput = document.getElementById('register-department');
        const adminTermsInput = document.getElementById('admin-terms');
        
        if (adminFields) {
            adminFields.style.display = show ? 'block' : 'none';
        }
        
        if (adminRoleInput) {
            adminRoleInput.required = show;
        }
        
        if (departmentInput) {
            departmentInput.required = show;
        }
        
        if (adminTermsInput) {
            adminTermsInput.required = show;
        }
    }

    async handleLogin() {
        const form = document.getElementById('login-form-element');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Clear previous errors
        this.clearErrors('login');
        
        // Validate form
        if (!this.validateLoginForm()) {
            return;
        }
        
        // Get form data
        const formData = new FormData(form);
        const loginData = {
            username: formData.get('email'),
            password: formData.get('password')
        };
        
        // Show loading state
        this.showLoading(submitBtn, 'Login');
        
        try {
            const response = await fetch(`${this.apiBase}/auth/users/login/`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(loginData)
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Login successful, received data:', data);
                console.log('User details from response:', {
                    id: data.user.id,
                    username: data.user.username,
                    email: data.user.email,
                    first_name: data.user.first_name,
                    last_name: data.user.last_name,
                    user_type: data.user.user_type,
                    get_full_name: `${data.user.first_name} ${data.user.last_name}`
                });
                
                // Store token and user data with timestamp
                const userDataWithTimestamp = {
                    ...data.user,
                    last_update: Date.now()
                };
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_data', JSON.stringify(userDataWithTimestamp));
                console.log('Stored auth token and user data with timestamp');
                console.log('LocalStorage user_data:', localStorage.getItem('user_data'));
                
                // Show success message
                this.showAlert('Login successful! Redirecting...', 'success');
                
                // Redirect based on user role
                setTimeout(() => {
                    console.log('Redirecting based on user type:', data.user.user_type);
                    if (data.user.user_type === 'admin' || data.user.is_staff) {
                        console.log('Redirecting to admin.html');
                        window.location.href = 'admin.html';
                    } else if (data.user.user_type === 'provider') {
                        console.log('Redirecting to dashboard/provider.html');
                        window.location.href = 'dashboard/provider.html';
                    } else {
                        console.log('Redirecting to dashboard/customer.html');
                        window.location.href = 'dashboard/customer.html';
                    }
                }, 1500);
                
            } else {
                const error = await response.json();
                console.log('Server error response:', error);
                this.showErrors('login', error);
                this.hideLoading(submitBtn, 'Login');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('Network error. Please check your connection.', 'error');
            this.hideLoading(submitBtn, 'Login');
        }
    }

    async handleRegister() {
        const form = document.getElementById('register-form-element');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Clear previous errors
        this.clearErrors('register');
        
        // Validate form
        if (!this.validateRegisterForm()) {
            return;
        }
        
        // Get form data
        const formData = new FormData(form);
        const phone = formData.get('phone');
        const address = formData.get('address');
        const registerData = {
            username: formData.get('email'),
            email: formData.get('email'),
            user_type: formData.get('user_type'),
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            phone_number: phone ? phone.trim() : null,
            address: address ? address.trim() : null,
            password: formData.get('password'),
            password_confirm: formData.get('confirm_password')
        };
        
        // Add provider-specific fields if user is a provider
        if (registerData.user_type === 'provider') {
            const businessName = formData.get('business_name');
            const services = Array.from(document.getElementById('register-services').selectedOptions).map(option => option.value);
            const location = formData.get('location');
            const experience = formData.get('experience');
            
            registerData.business_name = businessName ? businessName.trim() : '';
            registerData.services = services;
            registerData.location = location ? location.trim() : '';
            registerData.experience = experience ? parseInt(experience) : 0;
        }
        
        // Show loading state
        this.showLoading(submitBtn, 'Create Account');
        
        // Debug: Log the registration data
        console.log('Registration data being sent:', registerData);
        
        try {
            const response = await fetch(`${this.apiBase}/auth/users/register/`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(registerData)
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Registration successful, received data:', data);
                console.log('User details from response:', {
                    id: data.user.id,
                    username: data.user.username,
                    email: data.user.email,
                    first_name: data.user.first_name,
                    last_name: data.user.last_name,
                    user_type: data.user.user_type,
                    get_full_name: `${data.user.first_name} ${data.user.last_name}`
                });
                
                // Store token and user data with timestamp
                const userDataWithTimestamp = {
                    ...data.user,
                    last_update: Date.now()
                };
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_data', JSON.stringify(userDataWithTimestamp));
                console.log('Stored auth token and user data with timestamp');
                console.log('LocalStorage user_data:', localStorage.getItem('user_data'));
                
                this.showAlert('Registration successful! Redirecting...', 'success');
                
                // Reset form
                form.reset();
                this.toggleProviderFields(false);
                
                // Redirect based on user type
                setTimeout(() => {
                    console.log('Redirecting based on user type:', data.user.user_type);
                    if (data.user.user_type === 'admin') {
                        console.log('Redirecting to admin.html');
                        window.location.href = 'admin.html';
                    } else if (data.user.user_type === 'provider') {
                        console.log('Redirecting to dashboard/provider.html');
                        window.location.href = 'dashboard/provider.html';
                    } else {
                        console.log('Redirecting to dashboard/customer.html');
                        window.location.href = 'dashboard/customer.html';
                    }
                }, 1500);
                
            } else {
                const error = await response.json();
                console.log('Server error response:', error);
                this.showErrors('register', error);
                this.hideLoading(submitBtn, 'Create Account');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showAlert('Network error. Please check your connection.', 'error');
            this.hideLoading(submitBtn, 'Create Account');
        }
    }

    validateLoginForm() {
        let isValid = true;
        
        // Validate email
        if (!this.validateEmail('login-email')) {
            isValid = false;
        }
        
        // Validate password
        if (!this.validatePassword('login-password')) {
            isValid = false;
        }
        
        return isValid;
    }

    validateRegisterForm() {
        let isValid = true;
        
        // Validate user type
        const userType = document.getElementById('register-user-type').value;
        if (!userType) {
            this.showError('register-user-type', 'Please select a user type');
            isValid = false;
        }
        
        // Validate first name
        const firstName = document.getElementById('register-first-name').value.trim();
        if (!firstName) {
            this.showError('register-first-name', 'First name is required');
            isValid = false;
        }
        
        // Validate last name
        const lastName = document.getElementById('register-last-name').value.trim();
        if (!lastName) {
            this.showError('register-last-name', 'Last name is required');
            isValid = false;
        }
        
        // Validate email
        if (!this.validateEmail('register-email')) {
            isValid = false;
        }
        
        // Validate phone
        if (!this.validatePhone()) {
            isValid = false;
        }
        
        // Validate password
        if (!this.validatePassword('register-password')) {
            isValid = false;
        }
        
        // Validate confirm password
        if (!this.validateConfirmPassword()) {
            isValid = false;
        }
        
        // Validate provider fields if applicable
        if (userType === 'provider') {
            const businessName = document.getElementById('register-business-name').value.trim();
            if (!businessName) {
                this.showError('register-business-name', 'Business name is required for providers');
                isValid = false;
            }
            
            const services = document.getElementById('register-services').selectedOptions;
            if (services.length === 0) {
                this.showError('register-services', 'Please select at least one service');
                isValid = false;
            }
        }
        
        // Validate admin fields if applicable
        if (userType === 'admin') {
            const adminRole = document.getElementById('register-admin-role').value;
            if (!adminRole) {
                this.showError('register-admin-role', 'Admin role is required');
                isValid = false;
            }
            
            const department = document.getElementById('register-department').value;
            if (!department) {
                this.showError('register-department', 'Department is required');
                isValid = false;
            }
            
            const adminTerms = document.getElementById('admin-terms').checked;
            if (!adminTerms) {
                this.showError('admin-terms', 'You must agree to admin terms and policies');
                isValid = false;
            }
        }
        
        // Validate terms agreement
        const agreeTerms = document.getElementById('agree-terms').checked;
        if (!agreeTerms) {
            this.showError('agree-terms', 'You must agree to the terms and conditions');
            isValid = false;
        }
        
        return isValid;
    }

    validateEmail(inputId) {
        const input = document.getElementById(inputId);
        const email = input.value.trim();
        
        if (!email) {
            this.showError(inputId, 'Email is required');
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showError(inputId, 'Please enter a valid email address');
            return false;
        }
        
        this.clearError(inputId);
        return true;
    }

    validatePassword(inputId) {
        const input = document.getElementById(inputId);
        const password = input.value;
        
        if (!password) {
            this.showError(inputId, 'Password is required');
            return false;
        }
        
        if (password.length < 8) {
            this.showError(inputId, 'Password must be at least 8 characters long');
            return false;
        }
        
        this.clearError(inputId);
        return true;
    }

    validateConfirmPassword() {
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        if (!confirmPassword) {
            this.showError('register-confirm-password', 'Please confirm your password');
            return false;
        }
        
        if (password !== confirmPassword) {
            this.showError('register-confirm-password', 'Passwords do not match');
            return false;
        }
        
        this.clearError('register-confirm-password');
        return true;
    }

    validatePhone() {
        const phoneInput = document.getElementById('register-phone');
        const phone = phoneInput.value.trim();
        
        if (!phone) {
            this.showError('register-phone', 'Phone number is required');
            return false;
        }
        
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
            this.showError('register-phone', 'Please enter a valid phone number');
            return false;
        }
        
        this.clearError('register-phone');
        return true;
    }

    showError(inputId, message) {
        const errorElement = document.getElementById(`${inputId}-error`);
        const inputElement = document.getElementById(inputId);
        
        if (errorElement) {
            errorElement.textContent = message;
        }
        
        if (inputElement) {
            inputElement.classList.add('error');
        }
    }

    clearError(inputId) {
        const errorElement = document.getElementById(`${inputId}-error`);
        const inputElement = document.getElementById(inputId);
        
        if (errorElement) {
            errorElement.textContent = '';
        }
        
        if (inputElement) {
            inputElement.classList.remove('error');
        }
    }

    showErrors(formType, errors) {
        Object.keys(errors).forEach(field => {
            const inputId = `${formType}-${field.replace(/_/g, '-')}`;
            this.showError(inputId, errors[field]);
        });
    }

    clearErrors(formType) {
        const form = document.getElementById(`${formType}-form-element`);
        const errorElements = form.querySelectorAll('.error');
        const inputElements = form.querySelectorAll('input, select');
        
        errorElements.forEach(element => {
            element.textContent = '';
        });
        
        inputElements.forEach(element => {
            element.classList.remove('error');
        });
    }

    showLoading(button, originalText) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    hideLoading(button, originalText) {
        button.disabled = false;
        button.textContent = originalText;
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        // Insert at the top of the auth container
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) {
            authContainer.insertBefore(alertDiv, authContainer.firstChild);
        }
        
        // Remove after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Tab switching function
function switchTab(tabName) {
    // Hide all forms
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected form
    document.getElementById(`${tabName}-form`).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// Password toggle function
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});

// Handle mobile menu
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
});
