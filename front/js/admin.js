// FixMate - Admin Dashboard JavaScript

class AdminManager {
    constructor() {
        this.apiBase = '/api/admin';
        this.currentUser = null;
        this.token = localStorage.getItem('auth_token');
        this.currentSection = 'dashboard';
        this.users = [];
        this.providers = [];
        this.jobs = [];
        this.reviews = [];
        this.clearStaleUserData();
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.loadDashboardData();
        this.setupMobileMenu();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('href').substring(1);
                this.switchSection(section);
            });
        });

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Search inputs
        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.searchUsers(e.target.value);
            });
        }

        const providerSearch = document.getElementById('provider-search');
        if (providerSearch) {
            providerSearch.addEventListener('input', (e) => {
                this.searchProviders(e.target.value);
            });
        }

        const jobSearch = document.getElementById('job-search');
        if (jobSearch) {
            jobSearch.addEventListener('input', (e) => {
                this.searchJobs(e.target.value);
            });
        }

        const reviewSearch = document.getElementById('review-search');
        if (reviewSearch) {
            reviewSearch.addEventListener('input', (e) => {
                this.searchReviews(e.target.value);
            });
        }

        // Filter selects
        const userFilter = document.getElementById('user-filter');
        if (userFilter) {
            userFilter.addEventListener('change', (e) => {
                this.filterUsers(e.target.value);
            });
        }

        const providerFilter = document.getElementById('provider-filter');
        if (providerFilter) {
            providerFilter.addEventListener('change', (e) => {
                this.filterProviders(e.target.value);
            });
        }

        const jobFilter = document.getElementById('job-filter');
        if (jobFilter) {
            jobFilter.addEventListener('change', (e) => {
                this.filterJobs(e.target.value);
            });
        }

        const reviewFilter = document.getElementById('review-filter');
        if (reviewFilter) {
            reviewFilter.addEventListener('change', (e) => {
                this.filterReviews(e.target.value);
            });
        }

        // Modal close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
                this.closeModal(modalId);
            });
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    clearStaleUserData() {
        // Clear any stale user data to ensure fresh data is loaded
        const storedUserData = localStorage.getItem('user_data');
        if (storedUserData) {
            try {
                const userData = JSON.parse(storedUserData);
                console.log('Clearing stale user data:', userData);
                // Only clear if it's been more than 1 hour since last update
                const lastUpdate = userData.last_update || 0;
                const now = Date.now();
                const oneHour = 60 * 60 * 1000;
                
                if (now - lastUpdate > oneHour) {
                    console.log('User data is stale, clearing...');
                    localStorage.removeItem('user_data');
                }
            } catch (error) {
                console.log('Error parsing user data, clearing...', error);
                localStorage.removeItem('user_data');
            }
        }
    }

    setupMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.admin-nav ul');

        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                hamburger.classList.toggle('active');
            });
        }
    }

    async checkAuthentication() {
        if (!this.token) {
            window.location.href = 'auth.html';
            return;
        }

        try {
            const response = await fetch('/api/auth/verify/', {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                this.currentUser = await response.json();
                this.updateUI();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.logout();
        }
    }

    updateUI() {
        console.log('Admin dashboard updateUI called with currentUser:', this.currentUser);
        
        // Update user name in navigation if needed
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement && this.currentUser) {
            const displayName = this.currentUser.username || 'Admin User';
            console.log('Setting admin user name to:', displayName);
            console.log('Available user fields:', Object.keys(this.currentUser));
            userNameElement.textContent = displayName;
        } else {
            console.log('Cannot update admin UI - missing userNameElement or currentUser');
            console.log('userNameElement exists:', !!userNameElement);
            console.log('currentUser exists:', !!this.currentUser);
        }
    }

    // Section Management
    switchSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected section
        const sectionElement = document.getElementById(`${sectionName}-section`);
        if (sectionElement) {
            sectionElement.classList.add('active');
        }

        // Add active class to clicked nav link
        const navLink = document.querySelector(`[href="#${sectionName}"]`);
        if (navLink) {
            navLink.classList.add('active');
        }

        this.currentSection = sectionName;

        // Load section-specific data
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'providers':
                this.loadProviders();
                break;
            case 'jobs':
                this.loadJobs();
                break;
            case 'reviews':
                this.loadReviews();
                break;
            case 'reports':
                this.loadReports();
                break;
        }
    }

    // Dashboard Methods
    async loadDashboardData() {
        await Promise.all([
            this.loadDashboardStats(),
            this.loadRecentActivity(),
            this.loadSystemStatus()
        ]);
    }

    async loadDashboardStats() {
        try {
            const response = await fetch(`${this.apiBase}/dashboard/stats/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const stats = await response.json();
                this.updateDashboardStats(stats);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('total-users').textContent = stats.total_users || 0;
        document.getElementById('total-providers').textContent = stats.total_providers || 0;
        document.getElementById('total-jobs').textContent = stats.total_jobs || 0;
        document.getElementById('pending-validations').textContent = stats.pending_validations || 0;
    }

    async loadRecentActivity() {
        const activityList = document.getElementById('recent-activity');
        if (!activityList) return;

        this.showLoading(activityList);

        try {
            const response = await fetch(`${this.apiBase}/dashboard/activity/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const activities = await response.json();
                this.renderRecentActivity(activities);
            } else {
                activityList.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><h3>No Recent Activity</h3></div>';
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
            activityList.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Activity</h3></div>';
        }
    }

    renderRecentActivity(activities) {
        const activityList = document.getElementById('recent-activity');
        if (!activityList) return;

        if (activities.length === 0) {
            activityList.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><h3>No Recent Activity</h3></div>';
            return;
        }

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.description}</p>
                    <small>${this.formatDate(activity.timestamp)}</small>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'user_registration': 'user-plus',
            'provider_validation': 'user-check',
            'job_created': 'briefcase',
            'job_completed': 'check-circle',
            'review_posted': 'star',
            'payment_processed': 'credit-card'
        };
        return icons[type] || 'info';
    }

    async loadSystemStatus() {
        const systemStatus = document.getElementById('system-status');
        if (!systemStatus) return;

        try {
            const response = await fetch(`${this.apiBase}/dashboard/status/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const status = await response.json();
                this.renderSystemStatus(status);
            }
        } catch (error) {
            console.error('Error loading system status:', error);
        }
    }

    renderSystemStatus(status) {
        const systemStatus = document.getElementById('system-status');
        if (!systemStatus) return;

        systemStatus.innerHTML = `
            <div class="status-item ${status.database.status}">
                <span class="status-name">Database</span>
                <span class="status-value">
                    <span class="status-indicator ${status.database.status}"></span>
                    ${status.database.message}
                </span>
            </div>
            <div class="status-item ${status.api.status}">
                <span class="status-name">API</span>
                <span class="status-value">
                    <span class="status-indicator ${status.api.status}"></span>
                    ${status.api.message}
                </span>
            </div>
            <div class="status-item ${status.websocket.status}">
                <span class="status-name">WebSocket</span>
                <span class="status-value">
                    <span class="status-indicator ${status.websocket.status}"></span>
                    ${status.websocket.message}
                </span>
            </div>
            <div class="status-item ${status.storage.status}">
                <span class="status-name">Storage</span>
                <span class="status-value">
                    <span class="status-indicator ${status.storage.status}"></span>
                    ${status.storage.message}
                </span>
            </div>
        `;
    }

    // Users Management
    async loadUsers() {
        const usersTableBody = document.getElementById('users-table-body');
        if (!usersTableBody) return;

        this.showLoading(usersTableBody);

        try {
            const response = await fetch(`${this.apiBase}/users/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                this.users = await response.json();
                this.renderUsers();
            } else {
                usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
            }
        } catch (error) {
            console.error('Error loading users:', error);
            usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center error">Error loading users</td></tr>';
        }
    }

    renderUsers() {
        const usersTableBody = document.getElementById('users-table-body');
        if (!usersTableBody) return;

        if (this.users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
            return;
        }

        usersTableBody.innerHTML = this.users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.first_name} ${user.last_name}</td>
                <td>${user.email}</td>
                <td>${user.user_type}</td>
                <td>
                    <span class="status-badge ${user.status}">
                        ${user.status}
                    </span>
                </td>
                <td>${this.formatDate(user.date_joined)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-small" onclick="adminManager.viewUserDetails(${user.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.toggleUserStatus(${user.id})">
                            <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Provider Management
    async loadProviders() {
        await Promise.all([
            this.loadPendingValidations(),
            this.loadAllProviders()
        ]);
    }

    async loadPendingValidations() {
        const validationList = document.getElementById('validation-list');
        if (!validationList) return;

        this.showLoading(validationList);

        try {
            const response = await fetch(`${this.apiBase}/providers/pending/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const pendingProviders = await response.json();
                this.renderPendingValidations(pendingProviders);
            } else {
                validationList.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><h3>No Pending Validations</h3></div>';
            }
        } catch (error) {
            console.error('Error loading pending validations:', error);
            validationList.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Validations</h3></div>';
        }
    }

    renderPendingValidations(pendingProviders) {
        const validationList = document.getElementById('validation-list');
        if (!validationList) return;

        if (pendingProviders.length === 0) {
            validationList.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><h3>No Pending Validations</h3></div>';
            return;
        }

        validationList.innerHTML = pendingProviders.map(provider => `
            <div class="validation-item">
                <div class="validation-info">
                    <h4>${provider.business_name}</h4>
                    <p><strong>Owner:</strong> ${provider.owner_name}</p>
                    <p><strong>Email:</strong> ${provider.email}</p>
                    <p><strong>Services:</strong> ${provider.services.join(', ')}</p>
                    <p><strong>Submitted:</strong> ${this.formatDate(provider.submitted_at)}</p>
                </div>
                <div class="validation-actions">
                    <button class="btn btn-primary btn-small" onclick="adminManager.validateProvider(${provider.id}, true)">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-outline btn-small" onclick="adminManager.validateProvider(${provider.id}, false)">
                        <i class="fas fa-times"></i> Reject
                    </button>
                    <button class="btn btn-outline btn-small" onclick="adminManager.viewProviderDetails(${provider.id})">
                        <i class="fas fa-eye"></i> Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadAllProviders() {
        const providersTableBody = document.getElementById('providers-table-body');
        if (!providersTableBody) return;

        this.showLoading(providersTableBody);

        try {
            const response = await fetch(`${this.apiBase}/providers/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                this.providers = await response.json();
                this.renderProviders();
            } else {
                providersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No providers found</td></tr>';
            }
        } catch (error) {
            console.error('Error loading providers:', error);
            providersTableBody.innerHTML = '<tr><td colspan="7" class="text-center error">Error loading providers</td></tr>';
        }
    }

    renderProviders() {
        const providersTableBody = document.getElementById('providers-table-body');
        if (!providersTableBody) return;

        if (this.providers.length === 0) {
            providersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No providers found</td></tr>';
            return;
        }

        providersTableBody.innerHTML = this.providers.map(provider => `
            <tr>
                <td>${provider.id}</td>
                <td>${provider.business_name}</td>
                <td>${provider.owner_name}</td>
                <td>${provider.services_count} services</td>
                <td>${provider.average_rating || 'N/A'}</td>
                <td>
                    <span class="status-badge ${provider.validation_status}">
                        ${provider.validation_status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-small" onclick="adminManager.viewProviderDetails(${provider.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.editProvider(${provider.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.toggleProviderStatus(${provider.id})">
                            <i class="fas fa-${provider.status === 'active' ? 'ban' : 'check'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Jobs Management
    async loadJobs() {
        const jobsTableBody = document.getElementById('jobs-table-body');
        if (!jobsTableBody) return;

        this.showLoading(jobsTableBody);

        try {
            const response = await fetch(`${this.apiBase}/jobs/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                this.jobs = await response.json();
                this.renderJobs();
            } else {
                jobsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No jobs found</td></tr>';
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
            jobsTableBody.innerHTML = '<tr><td colspan="8" class="text-center error">Error loading jobs</td></tr>';
        }
    }

    renderJobs() {
        const jobsTableBody = document.getElementById('jobs-table-body');
        if (!jobsTableBody) return;

        if (this.jobs.length === 0) {
            jobsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No jobs found</td></tr>';
            return;
        }

        jobsTableBody.innerHTML = this.jobs.map(job => `
            <tr>
                <td>${job.id}</td>
                <td>${job.title}</td>
                <td>${job.customer_name}</td>
                <td>${job.provider_name || 'Unassigned'}</td>
                <td>
                    <span class="status-badge ${job.status}">
                        ${job.status.replace('_', ' ')}
                    </span>
                </td>
                <td>$${job.budget}</td>
                <td>${this.formatDate(job.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-small" onclick="adminManager.viewJobDetails(${job.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.editJob(${job.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.deleteJob(${job.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Reviews Management
    async loadReviews() {
        const reviewsTableBody = document.getElementById('reviews-table-body');
        if (!reviewsTableBody) return;

        this.showLoading(reviewsTableBody);

        try {
            const response = await fetch(`${this.apiBase}/reviews/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                this.reviews = await response.json();
                this.renderReviews();
            } else {
                reviewsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No reviews found</td></tr>';
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
            reviewsTableBody.innerHTML = '<tr><td colspan="8" class="text-center error">Error loading reviews</td></tr>';
        }
    }

    renderReviews() {
        const reviewsTableBody = document.getElementById('reviews-table-body');
        if (!reviewsTableBody) return;

        if (this.reviews.length === 0) {
            reviewsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No reviews found</td></tr>';
            return;
        }

        reviewsTableBody.innerHTML = this.reviews.map(review => `
            <tr>
                <td>${review.id}</td>
                <td>${review.reviewer_name}</td>
                <td>${review.reviewed_name}</td>
                <td>${review.rating}</td>
                <td>${review.job_title}</td>
                <td>${this.formatDate(review.created_at)}</td>
                <td>
                    <span class="status-badge ${review.status}">
                        ${review.status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-small" onclick="adminManager.viewReviewDetails(${review.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.toggleReviewStatus(${review.id})">
                            <i class="fas fa-flag"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.deleteReview(${review.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Reports Management
    async loadReports() {
        // Placeholder for reports loading
        // In a real implementation, this would load chart data
        this.initializeCharts();
    }

    initializeCharts() {
        // Placeholder for chart initialization
        // In a real implementation, this would use Chart.js or similar library
        const charts = ['user-growth-chart', 'job-completion-chart', 'revenue-chart', 'provider-performance-chart'];
        charts.forEach(chartId => {
            const chartElement = document.getElementById(chartId);
            if (chartElement) {
                chartElement.innerHTML = '<div class="chart-placeholder">Chart will be rendered here</div>';
            }
        });
    }

    // Action Methods
    async validateProvider(providerId, approved) {
        try {
            const response = await fetch(`${this.apiBase}/providers/${providerId}/validate/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${this.token}`
                },
                body: JSON.stringify({ approved })
            });

            if (response.ok) {
                this.showAlert(`Provider ${approved ? 'approved' : 'rejected'} successfully!`, 'success');
                this.loadProviders();
            } else {
                this.showAlert('Failed to validate provider. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Provider validation error:', error);
            this.showAlert('Network error. Please check your connection.', 'error');
        }
    }

    viewUserDetails(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const modal = document.getElementById('user-detail-modal');
        const content = document.getElementById('user-detail-content');
        
        content.innerHTML = `
            <div class="user-detail-section">
                <h4>Basic Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>ID:</strong> ${user.id}
                    </div>
                    <div class="detail-item">
                        <strong>Name:</strong> ${user.first_name} ${user.last_name}
                    </div>
                    <div class="detail-item">
                        <strong>Email:</strong> ${user.email}
                    </div>
                    <div class="detail-item">
                        <strong>Phone:</strong> ${user.phone || 'Not provided'}
                    </div>
                    <div class="detail-item">
                        <strong>User Type:</strong> ${user.user_type}
                    </div>
                    <div class="detail-item">
                        <strong>Status:</strong> 
                        <span class="status-badge ${user.status}">${user.status}</span>
                    </div>
                </div>
            </div>
            
            <div class="user-detail-section">
                <h4>Account Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Date Joined:</strong> ${this.formatDate(user.date_joined)}
                    </div>
                    <div class="detail-item">
                        <strong>Last Login:</strong> ${this.formatDate(user.last_login)}
                    </div>
                    <div class="detail-item">
                        <strong>Email Verified:</strong> ${user.email_verified ? 'Yes' : 'No'}
                    </div>
                    <div class="detail-item">
                        <strong>Profile Complete:</strong> ${user.profile_complete ? 'Yes' : 'No'}
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    viewProviderDetails(providerId) {
        const provider = this.providers.find(p => p.id === providerId);
        if (!provider) return;

        const modal = document.getElementById('provider-validation-modal');
        const content = document.getElementById('provider-validation-content');
        
        content.innerHTML = `
            <div class="provider-detail-section">
                <h4>Business Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>ID:</strong> ${provider.id}
                    </div>
                    <div class="detail-item">
                        <strong>Business Name:</strong> ${provider.business_name}
                    </div>
                    <div class="detail-item">
                        <strong>Owner:</strong> ${provider.owner_name}
                    </div>
                    <div class="detail-item">
                        <strong>Email:</strong> ${provider.email}
                    </div>
                    <div class="detail-item">
                        <strong>Phone:</strong> ${provider.phone || 'Not provided'}
                    </div>
                    <div class="detail-item">
                        <strong>Status:</strong> 
                        <span class="status-badge ${provider.validation_status}">${provider.validation_status}</span>
                    </div>
                </div>
            </div>
            
            <div class="provider-detail-section">
                <h4>Services</h4>
                <div class="services-list">
                    ${provider.services.map(service => `
                        <div class="service-item">
                            <span>${service.name}</span>
                            <span>$${service.hourly_rate}/hr</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="provider-detail-section">
                <h4>Performance</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Average Rating:</strong> ${provider.average_rating || 'N/A'}
                    </div>
                    <div class="detail-item">
                        <strong>Total Reviews:</strong> ${provider.total_reviews || 0}
                    </div>
                    <div class="detail-item">
                        <strong>Jobs Completed:</strong> ${provider.jobs_completed || 0}
                    </div>
                    <div class="detail-item">
                        <strong>Response Rate:</strong> ${provider.response_rate || 0}%
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    viewJobDetails(jobId) {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return;

        const modal = document.getElementById('job-detail-modal');
        const content = document.getElementById('job-detail-content');
        
        content.innerHTML = `
            <div class="job-detail-section">
                <h4>Job Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>ID:</strong> ${job.id}
                    </div>
                    <div class="detail-item">
                        <strong>Title:</strong> ${job.title}
                    </div>
                    <div class="detail-item">
                        <strong>Description:</strong> ${job.description}
                    </div>
                    <div class="detail-item">
                        <strong>Category:</strong> ${job.category}
                    </div>
                    <div class="detail-item">
                        <strong>Budget:</strong> $${job.budget}
                    </div>
                    <div class="detail-item">
                        <strong>Status:</strong> 
                        <span class="status-badge ${job.status}">${job.status.replace('_', ' ')}</span>
                    </div>
                </div>
            </div>
            
            <div class="job-detail-section">
                <h4>Participants</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Customer:</strong> ${job.customer_name}
                    </div>
                    <div class="detail-item">
                        <strong>Provider:</strong> ${job.provider_name || 'Unassigned'}
                    </div>
                </div>
            </div>
            
            <div class="job-detail-section">
                <h4>Timeline</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Created:</strong> ${this.formatDate(job.created_at)}
                    </div>
                    <div class="detail-item">
                        <strong>Updated:</strong> ${this.formatDate(job.updated_at)}
                    </div>
                    <div class="detail-item">
                        <strong>Completed:</strong> ${job.completed_at ? this.formatDate(job.completed_at) : 'Not completed'}
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    // Placeholder methods for various actions
    editUser(userId) {
        this.showAlert('Edit user functionality coming soon!', 'info');
    }

    toggleUserStatus(userId) {
        this.showAlert('Toggle user status functionality coming soon!', 'info');
    }

    editProvider(providerId) {
        this.showAlert('Edit provider functionality coming soon!', 'info');
    }

    toggleProviderStatus(providerId) {
        this.showAlert('Toggle provider status functionality coming soon!', 'info');
    }

    editJob(jobId) {
        this.showAlert('Edit job functionality coming soon!', 'info');
    }

    deleteJob(jobId) {
        this.showAlert('Delete job functionality coming soon!', 'info');
    }

    viewReviewDetails(reviewId) {
        this.showAlert('View review details functionality coming soon!', 'info');
    }

    toggleReviewStatus(reviewId) {
        this.showAlert('Toggle review status functionality coming soon!', 'info');
    }

    deleteReview(reviewId) {
        this.showAlert('Delete review functionality coming soon!', 'info');
    }

    // Search and Filter Methods
    searchUsers(query) {
        if (!query) {
            this.renderUsers();
            return;
        }

        const filtered = this.users.filter(user => 
            user.first_name.toLowerCase().includes(query.toLowerCase()) ||
            user.last_name.toLowerCase().includes(query.toLowerCase()) ||
            user.email.toLowerCase().includes(query.toLowerCase())
        );

        this.renderFilteredUsers(filtered);
    }

    filterUsers(filter) {
        let filtered = [...this.users];

        switch (filter) {
            case 'customer':
                filtered = this.users.filter(user => user.user_type === 'customer');
                break;
            case 'provider':
                filtered = this.users.filter(user => user.user_type === 'provider');
                break;
            case 'pending':
                filtered = this.users.filter(user => user.status === 'pending');
                break;
            case 'suspended':
                filtered = this.users.filter(user => user.status === 'suspended');
                break;
        }

        this.renderFilteredUsers(filtered);
    }

    renderFilteredUsers(users) {
        const usersTableBody = document.getElementById('users-table-body');
        if (!usersTableBody) return;

        if (users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No users found matching your criteria</td></tr>';
            return;
        }

        usersTableBody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.first_name} ${user.last_name}</td>
                <td>${user.email}</td>
                <td>${user.user_type}</td>
                <td>
                    <span class="status-badge ${user.status}">
                        ${user.status}
                    </span>
                </td>
                <td>${this.formatDate(user.date_joined)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-small" onclick="adminManager.viewUserDetails(${user.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.toggleUserStatus(${user.id})">
                            <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    searchProviders(query) {
        if (!query) {
            this.renderProviders();
            return;
        }

        const filtered = this.providers.filter(provider => 
            provider.business_name.toLowerCase().includes(query.toLowerCase()) ||
            provider.owner_name.toLowerCase().includes(query.toLowerCase()) ||
            provider.email.toLowerCase().includes(query.toLowerCase())
        );

        this.renderFilteredProviders(filtered);
    }

    filterProviders(filter) {
        let filtered = [...this.providers];

        switch (filter) {
            case 'pending':
                filtered = this.providers.filter(provider => provider.validation_status === 'pending');
                break;
            case 'validated':
                filtered = this.providers.filter(provider => provider.validation_status === 'validated');
                break;
            case 'rejected':
                filtered = this.providers.filter(provider => provider.validation_status === 'rejected');
                break;
        }

        this.renderFilteredProviders(filtered);
    }

    renderFilteredProviders(providers) {
        const providersTableBody = document.getElementById('providers-table-body');
        if (!providersTableBody) return;

        if (providers.length === 0) {
            providersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No providers found matching your criteria</td></tr>';
            return;
        }

        providersTableBody.innerHTML = providers.map(provider => `
            <tr>
                <td>${provider.id}</td>
                <td>${provider.business_name}</td>
                <td>${provider.owner_name}</td>
                <td>${provider.services_count} services</td>
                <td>${provider.average_rating || 'N/A'}</td>
                <td>
                    <span class="status-badge ${provider.validation_status}">
                        ${provider.validation_status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-small" onclick="adminManager.viewProviderDetails(${provider.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.editProvider(${provider.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.toggleProviderStatus(${provider.id})">
                            <i class="fas fa-${provider.status === 'active' ? 'ban' : 'check'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    searchJobs(query) {
        if (!query) {
            this.renderJobs();
            return;
        }

        const filtered = this.jobs.filter(job => 
            job.title.toLowerCase().includes(query.toLowerCase()) ||
            job.customer_name.toLowerCase().includes(query.toLowerCase()) ||
            (job.provider_name && job.provider_name.toLowerCase().includes(query.toLowerCase()))
        );

        this.renderFilteredJobs(filtered);
    }

    filterJobs(filter) {
        let filtered = [...this.jobs];

        switch (filter) {
            case 'open':
                filtered = this.jobs.filter(job => job.status === 'open');
                break;
            case 'in_progress':
                filtered = this.jobs.filter(job => job.status === 'in_progress');
                break;
            case 'completed':
                filtered = this.jobs.filter(job => job.status === 'completed');
                break;
            case 'disputed':
                filtered = this.jobs.filter(job => job.status === 'disputed');
                break;
        }

        this.renderFilteredJobs(filtered);
    }

    renderFilteredJobs(jobs) {
        const jobsTableBody = document.getElementById('jobs-table-body');
        if (!jobsTableBody) return;

        if (jobs.length === 0) {
            jobsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No jobs found matching your criteria</td></tr>';
            return;
        }

        jobsTableBody.innerHTML = jobs.map(job => `
            <tr>
                <td>${job.id}</td>
                <td>${job.title}</td>
                <td>${job.customer_name}</td>
                <td>${job.provider_name || 'Unassigned'}</td>
                <td>
                    <span class="status-badge ${job.status}">
                        ${job.status.replace('_', ' ')}
                    </span>
                </td>
                <td>$${job.budget}</td>
                <td>${this.formatDate(job.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-small" onclick="adminManager.viewJobDetails(${job.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.editJob(${job.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.deleteJob(${job.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    searchReviews(query) {
        if (!query) {
            this.renderReviews();
            return;
        }

        const filtered = this.reviews.filter(review => 
            review.reviewer_name.toLowerCase().includes(query.toLowerCase()) ||
            review.reviewed_name.toLowerCase().includes(query.toLowerCase()) ||
            review.job_title.toLowerCase().includes(query.toLowerCase())
        );

        this.renderFilteredReviews(filtered);
    }

    filterReviews(filter) {
        let filtered = [...this.reviews];

        switch (filter) {
            case 'flagged':
                filtered = this.reviews.filter(review => review.status === 'flagged');
                break;
            case 'recent':
                filtered = this.reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'low_rating':
                filtered = this.reviews.filter(review => review.rating <= 2);
                break;
        }

        this.renderFilteredReviews(filtered);
    }

    renderFilteredReviews(reviews) {
        const reviewsTableBody = document.getElementById('reviews-table-body');
        if (!reviewsTableBody) return;

        if (reviews.length === 0) {
            reviewsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No reviews found matching your criteria</td></tr>';
            return;
        }

        reviewsTableBody.innerHTML = reviews.map(review => `
            <tr>
                <td>${review.id}</td>
                <td>${review.reviewer_name}</td>
                <td>${review.reviewed_name}</td>
                <td>${review.rating}</td>
                <td>${review.job_title}</td>
                <td>${this.formatDate(review.created_at)}</td>
                <td>
                    <span class="status-badge ${review.status}">
                        ${review.status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-small" onclick="adminManager.viewReviewDetails(${review.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.toggleReviewStatus(${review.id})">
                            <i class="fas fa-flag"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="adminManager.deleteReview(${review.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Utility Methods
    refreshDashboard() {
        this.loadDashboardData();
    }

    generateReport() {
        this.showAlert('Report generation functionality coming soon!', 'info');
    }

    exportData(dataType) {
        this.showAlert(`Export ${dataType} functionality coming soon!`, 'info');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showLoading(element, message = 'Loading...') {
        element.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> ${message}</div>`;
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        // Insert at the top of the current section
        const currentSection = document.querySelector('.admin-section.active');
        if (currentSection) {
            currentSection.insertBefore(alertDiv, currentSection.firstChild);
        }
        
        // Remove after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = 'index.html';
    }
}

// Initialize admin manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminManager = new AdminManager();
});
