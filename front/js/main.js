// FixMate - Enhanced Main JavaScript File with Responsive Features

class FixMateApp {
    constructor() {
        this.apiBase = '/api';
        this.currentUser = null;
        this.token = localStorage.getItem('auth_token');
        this.isMobileMenuOpen = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthentication();
        this.loadFeaturedProviders();
        this.setupMobileMenu();
        this.setupResponsiveFeatures();
        this.setupScrollEffects();
        this.setupAccessibility();
    }

    setupEventListeners() {
        // Navigation smooth scrolling with offset for fixed navbar
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
                    const targetPosition = target.offsetTop - navbarHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Close mobile menu if open
                    if (this.isMobileMenuOpen) {
                        this.closeMobileMenu();
                    }
                }
            });
        });

        // Contact form
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleContactForm();
            });
        }

        // Mobile menu toggle
        const hamburger = document.querySelector('.hamburger');
        if (hamburger) {
            hamburger.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMobileMenuOpen) {
                const navMenu = document.querySelector('.nav-menu');
                const hamburger = document.querySelector('.hamburger');
                
                if (navMenu && hamburger && !navMenu.contains(e.target) && !hamburger.contains(e.target)) {
                    this.closeMobileMenu();
                }
            }
        });
        
        // Close mobile menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobileMenuOpen) {
                this.closeMobileMenu();
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));
    }

    setupMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');

        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }
    }

    toggleMobileMenu() {
        const navMenu = document.querySelector('.nav-menu');
        const hamburger = document.querySelector('.hamburger');
        
        if (navMenu && hamburger) {
            this.isMobileMenuOpen = !this.isMobileMenuOpen;
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
            
            // Prevent body scroll when mobile menu is open
            if (this.isMobileMenuOpen) {
                document.body.style.overflow = 'hidden';
                // Add ARIA attributes for accessibility
                hamburger.setAttribute('aria-expanded', 'true');
                navMenu.setAttribute('aria-hidden', 'false');
            } else {
                document.body.style.overflow = '';
                hamburger.setAttribute('aria-expanded', 'false');
                navMenu.setAttribute('aria-hidden', 'true');
            }
        }
    }
    
    closeMobileMenu() {
        const navMenu = document.querySelector('.nav-menu');
        const hamburger = document.querySelector('.hamburger');
        
        if (navMenu && hamburger && this.isMobileMenuOpen) {
            this.isMobileMenuOpen = false;
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            document.body.style.overflow = '';
            hamburger.setAttribute('aria-expanded', 'false');
            navMenu.setAttribute('aria-hidden', 'true');
        }
    }

    async checkAuthentication() {
        if (this.token) {
            try {
                const response = await fetch(`${this.apiBase}/auth/users/profile/`, {
                    headers: {
                        'Authorization': `Token ${this.token}`
                    }
                });

                if (response.ok) {
                    this.currentUser = await response.json();
                    this.updateNavigation();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Authentication check failed:', error);
                this.logout();
            }
        }
    }

    updateNavigation() {
        const navAuth = document.querySelector('.nav-auth');
        const navAuthMobile = document.querySelector('.nav-auth-mobile');
        
        // Check if we're on the index.html page
        const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
        
        if (isIndexPage) {
            // Always show Login/Sign Up on index.html
            const authMenu = `
                <a href="auth.html" class="btn btn-outline">Login</a>
                <a href="auth.html?register=true" class="btn btn-primary">Sign Up</a>
            `;
            
            if (navAuth) {
                navAuth.innerHTML = authMenu;
            }
            
            if (navAuthMobile) {
                navAuthMobile.innerHTML = authMenu;
            }
        } else if (this.currentUser) {
            // Show user menu on other pages if authenticated
            const userMenu = `
                <div class="user-menu">
                    <span class="user-welcome">Welcome, ${this.currentUser.get_full_name || this.currentUser.username}</span>
                    <div class="user-dropdown">
                        <a href="dashboard.html" class="btn btn-primary">
                            <i class="fas fa-tachometer-alt"></i> Dashboard
                        </a>
                        <button class="btn btn-outline" onclick="app.logout()">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            `;
            
            if (navAuth) {
                navAuth.innerHTML = userMenu;
            }
            
            if (navAuthMobile) {
                navAuthMobile.innerHTML = userMenu;
            }
        } else {
            // Show Login/Sign Up on other pages if not authenticated
            const authMenu = `
                <a href="auth.html" class="btn btn-outline">
                    <i class="fas fa-sign-in-alt"></i> Login
                </a>
                <a href="auth.html?register=true" class="btn btn-primary">
                    <i class="fas fa-user-plus"></i> Sign Up
                </a>
            `;
            
            if (navAuth) {
                navAuth.innerHTML = authMenu;
            }
            
            if (navAuthMobile) {
                navAuthMobile.innerHTML = authMenu;
            }
        }
    }

    async loadFeaturedProviders() {
        const providersGrid = document.getElementById('featured-providers');
        if (!providersGrid) return;

        try {
            const response = await fetch(`${this.apiBase}/services/providers/?featured=true`);
            if (response.ok) {
                const providers = await response.json();
                this.renderFeaturedProviders(providers);
            } else {
                providersGrid.innerHTML = '<p class="text-center">Unable to load providers at this time.</p>';
            }
        } catch (error) {
            console.error('Error loading featured providers:', error);
            providersGrid.innerHTML = '<p class="text-center">Unable to load providers at this time.</p>';
        }
    }

    renderFeaturedProviders(providers) {
        const providersGrid = document.getElementById('featured-providers');
        if (!providersGrid) return;

        providersGrid.innerHTML = providers.map(provider => `
            <div class="provider-card">
                <div class="provider-header">
                    <img src="${provider.profile_image || 'images/default-avatar.png'}" 
                         alt="${provider.business_name || provider.username}" 
                         class="provider-avatar">
                    <div class="provider-info">
                        <h4>${provider.business_name || provider.username}</h4>
                        <div class="provider-rating">
                            ${this.renderStars(provider.average_rating || 0)}
                            <span>(${provider.review_count || 0} reviews)</span>
                        </div>
                    </div>
                </div>
                <div class="provider-services">
                    ${provider.services.map(service => 
                        `<span>${service.name}</span>`
                    ).join('')}
                </div>
                <div class="provider-stats">
                    <span><i class="fas fa-check-circle"></i> ${provider.completed_jobs || 0} Jobs</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${provider.location || 'Location not specified'}</span>
                </div>
                <div class="provider-actions">
                    <a href="providers.html?id=${provider.id}" class="btn btn-primary">View Profile</a>
                </div>
            </div>
        `).join('');
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        
        // Add full stars
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        // Add half star if needed
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        // Add empty stars
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    async handleContactForm() {
        const form = document.getElementById('contact-form');
        const formData = new FormData(form);
        
        const contactData = {
            name: formData.get('contact-name') || document.getElementById('contact-name').value,
            email: formData.get('contact-email') || document.getElementById('contact-email').value,
            message: formData.get('contact-message') || document.getElementById('contact-message').value
        };

        try {
            const response = await fetch(`${this.apiBase}/contact/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(contactData)
            });

            if (response.ok) {
                this.showAlert('Thank you for your message! We\'ll get back to you soon.', 'success');
                form.reset();
            } else {
                this.showAlert('Failed to send message. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Contact form submission failed:', error);
            this.showAlert('Failed to send message. Please check your internet connection.', 'error');
        }
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        // Insert at the top of the body
        document.body.insertBefore(alertDiv, document.body.firstChild);
        
        // Remove after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.apiBase}/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                this.token = data.token;
                localStorage.setItem('auth_token', this.token);
                this.currentUser = data.user;
                this.updateNavigation();
                this.showAlert('Login successful!', 'success');
                
                // Redirect based on user role
                setTimeout(() => {
                    if (data.user.is_staff) {
                        window.location.href = 'admin/dashboard.html';
                    } else if (data.user.user_type === 'provider') {
                        window.location.href = 'dashboard/provider.html';
                    } else {
                        window.location.href = 'dashboard/customer.html';
                    }
                }, 1000);
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Login failed. Please check your credentials.', 'error');
            }
        } catch (error) {
            console.error('Login failed:', error);
            this.showAlert('Login failed. Please check your internet connection.', 'error');
        }
    }

    async register(userData) {
        try {
            const response = await fetch(`${this.apiBase}/auth/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                this.showAlert('Registration successful! Please wait for admin approval.', 'success');
                setTimeout(() => {
                    window.location.href = 'auth.html';
                }, 2000);
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Registration failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Registration failed:', error);
            this.showAlert('Registration failed. Please check your internet connection.', 'error');
        }
    }

    logout() {
        localStorage.removeItem('auth_token');
        this.currentUser = null;
        this.token = null;
        window.location.href = 'index.html';
    }

    // Utility methods
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePhone(phone) {
        const re = /^[\+]?[1-9][\d]{0,15}$/;
        return re.test(phone);
    }

    showLoading(element) {
        if (element) {
            element.innerHTML = '<div class="spinner"></div>';
            element.disabled = true;
        }
    }

    hideLoading(element, originalContent) {
        if (element) {
            element.innerHTML = originalContent;
            element.disabled = false;
        }
    }

    setupResponsiveFeatures() {
        // Add responsive classes based on screen size
        this.updateResponsiveClasses();
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateResponsiveClasses();
            }, 100);
        });
    }
    
    updateResponsiveClasses() {
        const width = window.innerWidth;
        const body = document.body;
        
        // Remove existing responsive classes
        body.classList.remove('mobile', 'tablet', 'desktop');
        
        // Add appropriate class based on screen size
        if (width < 768) {
            body.classList.add('mobile');
        } else if (width < 992) {
            body.classList.add('tablet');
        } else {
            body.classList.add('desktop');
        }
    }
    
    setupScrollEffects() {
        let lastScroll = 0;
        const navbar = document.querySelector('.navbar');
        
        if (navbar) {
            window.addEventListener('scroll', () => {
                const currentScroll = window.pageYOffset;
                
                // Add scrolled class when scrolling down
                if (currentScroll > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
                
                // Hide/show navbar based on scroll direction
                if (currentScroll > lastScroll && currentScroll > 100) {
                    navbar.classList.add('hidden');
                } else {
                    navbar.classList.remove('hidden');
                }
                
                lastScroll = currentScroll;
            });
        }
    }
    
    setupAccessibility() {
        // Add ARIA attributes to interactive elements
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger) {
            hamburger.setAttribute('role', 'button');
            hamburger.setAttribute('aria-label', 'Toggle navigation menu');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.setAttribute('aria-controls', 'nav-menu');
        }
        
        if (navMenu) {
            navMenu.setAttribute('id', 'nav-menu');
            navMenu.setAttribute('aria-hidden', 'true');
        }
        
        // Add keyboard navigation
        this.setupKeyboardNavigation();
    }
    
    setupKeyboardNavigation() {
        // Enhanced keyboard navigation for better accessibility
        document.addEventListener('keydown', (e) => {
            // Tab key navigation enhancements
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-nav');
            }
            
            // Remove keyboard-nav class when using mouse
            document.addEventListener('mousedown', () => {
                document.body.classList.remove('keyboard-nav');
            }, { once: true });
        });
    }
    
    handleResize() {
        this.updateResponsiveClasses();
        
        // Close mobile menu when resizing to desktop
        if (window.innerWidth >= 768 && this.isMobileMenuOpen) {
            this.closeMobileMenu();
        }
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    logout() {
        localStorage.removeItem('auth_token');
        this.currentUser = null;
        this.updateNavigation();
        window.location.href = 'index.html';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FixMateApp();
});

// Global functions for HTML onclick handlers
function logout() {
    if (window.app) {
        window.app.logout();
    }
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.app) {
        window.app.checkAuthentication();
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    if (window.app) {
        window.app.showAlert('You are back online!', 'success');
    }
});

window.addEventListener('offline', () => {
    if (window.app) {
        window.app.showAlert('You are offline. Some features may not work.', 'warning');
    }
});
