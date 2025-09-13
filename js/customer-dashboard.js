// FixMate - Customer Dashboard JavaScript

class CustomerDashboard {
    constructor() {
        this.apiBase = '/api';
        this.currentUser = null;
        this.token = localStorage.getItem('auth_token');
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
        // Post job form
        const postJobForm = document.getElementById('post-job-form');
        if (postJobForm) {
            postJobForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePostJob();
            });
        }

        // Profile form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileUpdate();
            });
        }

        // Job status filter
        const jobStatusFilter = document.getElementById('job-status-filter');
        if (jobStatusFilter) {
            jobStatusFilter.addEventListener('change', () => {
                this.loadMyJobs();
            });
        }

        // Provider search
        const providerSearch = document.getElementById('provider-search');
        if (providerSearch) {
            providerSearch.addEventListener('input', this.debounce(() => {
                this.searchProviders();
            }, 500));
        }

        // Real-time validation
        this.setupRealTimeValidation();
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
        // Mobile menu toggle
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
        }
    }

    async checkAuthentication() {
        if (!this.token) {
            window.location.href = '../auth.html';
            return;
        }

        try {
            console.log('Customer dashboard checking authentication with token:', this.token);
            const response = await fetch(`${this.apiBase}/auth/users/profile/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });
            console.log('Profile response status:', response.status);

            if (response.ok) {
                this.currentUser = await response.json();
                console.log('Customer dashboard authentication successful:', this.currentUser);
                this.updateUI();
            } else {
                console.log('Customer dashboard authentication failed');
                this.logout();
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.logout();
        }
    }

    updateUI() {
        console.log('Customer dashboard updateUI called with currentUser:', this.currentUser);
        
        // Update user name in navigation
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && this.currentUser) {
            const displayName = this.currentUser.get_full_name ? this.currentUser.get_full_name() : this.currentUser.username;
            console.log('Setting user name to:', displayName);
            console.log('Available user fields:', Object.keys(this.currentUser));
            userNameElement.textContent = displayName;
        } else {
            console.log('Cannot update UI - missing userNameElement or currentUser');
            console.log('userNameElement exists:', !!userNameElement);
            console.log('currentUser exists:', !!this.currentUser);
        }

        // Load profile data
        this.loadProfileData();
    }

    async loadDashboardData() {
        await Promise.all([
            this.loadStats(),
            this.loadRecentJobs(),
            this.loadMyJobs()
        ]);
    }

    async loadStats() {
        try {
            const response = await fetch(`${this.apiBase}/jobs/jobs/customer_stats/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const stats = await response.json();
                this.updateStats(stats);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStats(stats) {
        const activeJobsCount = document.getElementById('active-jobs-count');
        const completedJobsCount = document.getElementById('completed-jobs-count');
        const pendingProposalsCount = document.getElementById('pending-proposals-count');
        const totalSpentCount = document.getElementById('total-spent-count');

        if (activeJobsCount) activeJobsCount.textContent = stats.active_jobs || 0;
        if (completedJobsCount) completedJobsCount.textContent = stats.completed_jobs || 0;
        if (pendingProposalsCount) pendingProposalsCount.textContent = stats.pending_proposals || 0;
        if (totalSpentCount) totalSpentCount.textContent = `$${stats.total_spent || 0}`;
    }

    async loadRecentJobs() {
        const recentJobsList = document.getElementById('recent-jobs-list');
        if (!recentJobsList) return;

        try {
            const response = await fetch(`${this.apiBase}/jobs/jobs/customer_recent/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const jobs = await response.json();
                this.renderRecentJobs(jobs);
            } else {
                recentJobsList.innerHTML = '<p class="text-center">No recent jobs found.</p>';
            }
        } catch (error) {
            console.error('Error loading recent jobs:', error);
            recentJobsList.innerHTML = '<p class="text-center">Unable to load recent jobs.</p>';
        }
    }

    renderRecentJobs(jobs) {
        const recentJobsList = document.getElementById('recent-jobs-list');
        if (!recentJobsList) return;

        if (jobs.length === 0) {
            recentJobsList.innerHTML = '<p class="text-center">No recent jobs found.</p>';
            return;
        }

        recentJobsList.innerHTML = jobs.map(job => this.renderJobCard(job)).join('');
    }

    async loadMyJobs() {
        const myJobsList = document.getElementById('my-jobs-list');
        if (!myJobsList) return;

        const statusFilter = document.getElementById('job-status-filter')?.value || '';

        try {
            let url = `${this.apiBase}/jobs/jobs/`;
            if (statusFilter) {
                url += `?status=${statusFilter}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const jobs = await response.json();
                this.renderMyJobs(jobs);
            } else {
                myJobsList.innerHTML = '<p class="text-center">No jobs found.</p>';
            }
        } catch (error) {
            console.error('Error loading my jobs:', error);
            myJobsList.innerHTML = '<p class="text-center">Unable to load jobs.</p>';
        }
    }

    renderMyJobs(jobs) {
        const myJobsList = document.getElementById('my-jobs-list');
        if (!myJobsList) return;

        if (jobs.length === 0) {
            myJobsList.innerHTML = '<p class="text-center">No jobs found.</p>';
            return;
        }

        myJobsList.innerHTML = jobs.map(job => this.renderJobCard(job, true)).join('');
    }

    renderJobCard(job, showActions = false) {
        const statusClass = `status-${job.status}`;
        const actions = showActions ? this.renderJobActions(job) : '';

        return `
            <div class="job-card">
                <div class="job-header">
                    <div>
                        <h3 class="job-title">${job.title}</h3>
                        <span class="job-status ${statusClass}">${this.formatStatus(job.status)}</span>
                    </div>
                </div>
                <div class="job-details">
                    <p><strong>Category:</strong> ${this.formatCategory(job.category)}</p>
                    <p><strong>Location:</strong> ${job.location}</p>
                    <p><strong>Budget:</strong> $${job.budget || 'Not specified'}</p>
                    <p><strong>Description:</strong> ${job.description}</p>
                </div>
                <div class="job-meta">
                    <span><i class="fas fa-calendar"></i> Posted ${this.formatDate(job.created_at)}</span>
                    <span><i class="fas fa-clock"></i> ${job.urgency || 'Medium'} priority</span>
                </div>
                ${actions}
            </div>
        `;
    }

    renderJobActions(job) {
        let actions = '<div class="job-actions">';

        if (job.status === 'pending') {
            actions += `
                <button class="btn btn-outline" onclick="customerDashboard.editJob(${job.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-error" onclick="customerDashboard.cancelJob(${job.id})">
                    <i class="fas fa-times"></i> Cancel
                </button>
            `;
        } else if (job.status === 'accepted') {
            actions += `
                <button class="btn btn-primary" onclick="customerDashboard.viewProposals(${job.id})">
                    <i class="fas fa-eye"></i> View Proposals
                </button>
                <button class="btn btn-outline" onclick="customerDashboard.messageProvider(${job.provider_id})">
                    <i class="fas fa-message"></i> Message Provider
                </button>
            `;
        } else if (job.status === 'completed') {
            actions += `
                <button class="btn btn-primary" onclick="customerDashboard.leaveReview(${job.id})">
                    <i class="fas fa-star"></i> Leave Review
                </button>
                <button class="btn btn-outline" onclick="customerDashboard.repostJob(${job.id})">
                    <i class="fas fa-redo"></i> Repost Job
                </button>
            `;
        }

        actions += '</div>';
        return actions;
    }

    async handlePostJob() {
        const form = document.getElementById('post-job-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Clear previous errors
        this.clearFormErrors('post-job');
        
        // Validate form
        if (!this.validateJobForm()) {
            return;
        }
        
        // Get form data
        const formData = new FormData(form);
        const jobData = {
            title: formData.get('title'),
            category: formData.get('category'),
            description: formData.get('description'),
            budget: formData.get('budget') || null,
            urgency: formData.get('urgency'),
            location: formData.get('location'),
            start_date: formData.get('start_date') || null
        };
        
        // Show loading state
        this.showLoading(submitBtn, 'Post Job');
        
        try {
            const response = await fetch(`${this.apiBase}/jobs/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${this.token}`
                },
                body: JSON.stringify(jobData)
            });
            
            if (response.ok) {
                const job = await response.json();
                
                // Handle image uploads if any
                const imageFiles = formData.getAll('images');
                if (imageFiles.length > 0) {
                    await this.uploadJobImages(job.id, imageFiles);
                }
                
                this.showAlert('Job posted successfully!', 'success');
                form.reset();
                
                // Refresh dashboard data
                this.loadDashboardData();
                
                // Switch to my jobs section
                showSection('my-jobs');
                
            } else {
                const error = await response.json();
                this.showFormErrors('post-job', error);
                this.hideLoading(submitBtn, 'Post Job');
            }
        } catch (error) {
            console.error('Job posting error:', error);
            this.showAlert('Network error. Please check your connection.', 'error');
            this.hideLoading(submitBtn, 'Post Job');
        }
    }

    async uploadJobImages(jobId, imageFiles) {
        const formData = new FormData();
        imageFiles.forEach(file => {
            formData.append('images', file);
        });

        try {
            const response = await fetch(`${this.apiBase}/jobs/${jobId}/upload-images/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${this.token}`
                },
                body: formData
            });

            if (!response.ok) {
                console.error('Image upload failed');
            }
        } catch (error) {
            console.error('Image upload error:', error);
        }
    }

    validateJobForm() {
        let isValid = true;
        
        // Validate title
        const title = document.getElementById('job-title').value.trim();
        if (!title) {
            this.showFieldError('job-title', 'Job title is required');
            isValid = false;
        }
        
        // Validate category
        const category = document.getElementById('job-category').value;
        if (!category) {
            this.showFieldError('job-category', 'Category is required');
            isValid = false;
        }
        
        // Validate description
        const description = document.getElementById('job-description').value.trim();
        if (!description) {
            this.showFieldError('job-description', 'Job description is required');
            isValid = false;
        }
        
        // Validate urgency
        const urgency = document.getElementById('job-urgency').value;
        if (!urgency) {
            this.showFieldError('job-urgency', 'Urgency is required');
            isValid = false;
        }
        
        // Validate location
        const location = document.getElementById('job-location').value.trim();
        if (!location) {
            this.showFieldError('job-location', 'Location is required');
            isValid = false;
        }
        
        return isValid;
    }

    async searchProviders() {
        const providersList = document.getElementById('providers-list');
        if (!providersList) return;

        const search = document.getElementById('provider-search')?.value || '';
        const category = document.getElementById('provider-category')?.value || '';
        const location = document.getElementById('provider-location')?.value || '';

        try {
            let url = `${this.apiBase}/services/providers/?`;
            const params = new URLSearchParams();
            
            if (search) params.append('search', search);
            if (category) params.append('category', category);
            if (location) params.append('location', location);
            
            url += params.toString();

            const response = await fetch(url);
            if (response.ok) {
                const providers = await response.json();
                this.renderProviders(providers);
            } else {
                providersList.innerHTML = '<p class="text-center">No providers found.</p>';
            }
        } catch (error) {
            console.error('Error searching providers:', error);
            providersList.innerHTML = '<p class="text-center">Unable to search providers.</p>';
        }
    }

    renderProviders(providers) {
        const providersList = document.getElementById('providers-list');
        if (!providersList) return;

        if (providers.length === 0) {
            providersList.innerHTML = '<p class="text-center">No providers found.</p>';
            return;
        }

        providersList.innerHTML = providers.map(provider => `
            <div class="provider-card">
                <div class="provider-header">
                    <img src="${provider.profile_image || '../images/default-avatar.png'}" 
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
                    <button class="btn btn-primary" onclick="customerDashboard.viewProvider(${provider.id})">
                        <i class="fas fa-eye"></i> View Profile
                    </button>
                    <button class="btn btn-outline" onclick="customerDashboard.messageProvider(${provider.id})">
                        <i class="fas fa-message"></i> Message
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadProfileData() {
        if (!this.currentUser) return;

        // Populate profile form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            document.getElementById('profile-first-name').value = this.currentUser.first_name || '';
            document.getElementById('profile-last-name').value = this.currentUser.last_name || '';
            document.getElementById('profile-email').value = this.currentUser.email || '';
            document.getElementById('profile-phone').value = this.currentUser.phone || '';
            document.getElementById('profile-address').value = this.currentUser.address || '';
            document.getElementById('profile-bio').value = this.currentUser.bio || '';
        }
    }

    async loadReviews() {
        const reviewsList = document.getElementById('reviews-list');
        if (!reviewsList) return;

        try {
            const response = await fetch(`${this.apiBase}/services/reviews/?customer=${this.currentUser.id}`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const reviews = await response.json();
                this.renderReviews(reviews);
            } else {
                reviewsList.innerHTML = '<p class="text-center">No reviews found.</p>';
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
            reviewsList.innerHTML = '<p class="text-center">Unable to load reviews.</p>';
        }
    }

    renderReviews(reviews) {
        const reviewsList = document.getElementById('reviews-list');
        if (!reviewsList) return;

        if (reviews.length === 0) {
            reviewsList.innerHTML = '<p class="text-center">No reviews found.</p>';
            return;
        }

        reviewsList.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <div>
                        <h4>${review.provider_name || review.provider}</h4>
                        <div class="review-rating">
                            ${this.renderStars(review.rating)}
                            <span>${review.rating}/5</span>
                        </div>
                    </div>
                    <span class="review-date">${this.formatDate(review.created_at)}</span>
                </div>
                <div class="review-content">
                    <p>${review.comment}</p>
                </div>
                <div class="review-job">
                    <small>For job: ${review.job_title || 'Job #' + review.job}</small>
                </div>
            </div>
        `).join('');
    }

    async handleProfileUpdate() {
        const form = document.getElementById('profile-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Get form data
        const formData = new FormData(form);
        const profileData = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            bio: formData.get('bio')
        };
        
        // Show loading state
        this.showLoading(submitBtn, 'Update Profile');
        
        try {
            const response = await fetch(`${this.apiBase}/auth/users/profile/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${this.token}`
                },
                body: JSON.stringify(profileData)
            });
            
            if (response.ok) {
                this.currentUser = await response.json();
                this.updateUI();
                this.showAlert('Profile updated successfully!', 'success');
            } else {
                const error = await response.json();
                this.showAlert('Failed to update profile. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            this.showAlert('Network error. Please check your connection.', 'error');
        } finally {
            this.hideLoading(submitBtn, 'Update Profile');
        }
    }

    // Utility methods
    formatStatus(status) {
        return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatCategory(category) {
        return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        return stars;
    }

    showFieldError(fieldId, message) {
        const errorElement = document.getElementById(`${fieldId}-error`);
        const inputElement = document.getElementById(fieldId);
        
        if (errorElement) {
            errorElement.textContent = message;
        }
        
        if (inputElement) {
            inputElement.classList.add('error');
        }
    }

    clearFormErrors(formPrefix) {
        const form = document.getElementById(`${formPrefix}-form`);
        const errorElements = form.querySelectorAll('.error');
        const inputElements = form.querySelectorAll('input, select, textarea');
        
        errorElements.forEach(element => {
            element.textContent = '';
        });
        
        inputElements.forEach(element => {
            element.classList.remove('error');
        });
    }

    showFormErrors(formPrefix, errors) {
        Object.keys(errors).forEach(field => {
            const fieldId = `${formPrefix}-${field.replace(/_/g, '-')}`;
            this.showFieldError(fieldId, errors[field]);
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
        
        // Insert at the top of the dashboard content
        const dashboardContent = document.querySelector('.dashboard-content');
        if (dashboardContent) {
            dashboardContent.insertBefore(alertDiv, dashboardContent.firstChild);
        }
        
        // Remove after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
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

    setupRealTimeValidation() {
        // Add real-time validation for job form fields
        const jobFields = ['job-title', 'job-category', 'job-description', 'job-urgency', 'job-location'];
        jobFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => {
                    this.validateJobField(fieldId);
                });
            }
        });
    }

    validateJobField(fieldId) {
        const field = document.getElementById(fieldId);
        const value = field.value.trim();
        
        if (!value) {
            this.showFieldError(fieldId, 'This field is required');
            return false;
        }
        
        this.clearFieldError(fieldId);
        return true;
    }

    clearFieldError(fieldId) {
        const errorElement = document.getElementById(`${fieldId}-error`);
        const inputElement = document.getElementById(fieldId);
        
        if (errorElement) {
            errorElement.textContent = '';
        }
        
        if (inputElement) {
            inputElement.classList.remove('error');
        }
    }

    // Action methods
    async editJob(jobId) {
        try {
            const response = await fetch(`${this.apiBase}/jobs/${jobId}/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });
            
            if (response.ok) {
                const job = await response.json();
                // Populate the post job form with existing data
                document.getElementById('job-title').value = job.title;
                document.getElementById('job-category').value = job.category;
                document.getElementById('job-description').value = job.description;
                document.getElementById('job-budget').value = job.budget || '';
                document.getElementById('job-urgency').value = job.urgency;
                document.getElementById('job-location').value = job.location;
                document.getElementById('job-start-date').value = job.start_date || '';
                
                // Switch to post job section
                showSection('post-job');
                this.showAlert('Job loaded for editing. Update and submit to save changes.', 'info');
            } else {
                this.showAlert('Failed to load job for editing.', 'error');
            }
        } catch (error) {
            console.error('Error loading job for editing:', error);
            this.showAlert('Network error. Please check your connection.', 'error');
        }
    }

    async cancelJob(jobId) {
        if (confirm('Are you sure you want to cancel this job?')) {
            try {
                const response = await fetch(`${this.apiBase}/jobs/${jobId}/`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Token ${this.token}`
                    },
                    body: JSON.stringify({ status: 'cancelled' })
                });
                
                if (response.ok) {
                    this.showAlert('Job cancelled successfully.', 'success');
                    this.loadMyJobs();
                    this.loadStats();
                } else {
                    this.showAlert('Failed to cancel job.', 'error');
                }
            } catch (error) {
                console.error('Error cancelling job:', error);
                this.showAlert('Network error. Please check your connection.', 'error');
            }
        }
    }

    async viewProposals(jobId) {
        try {
            const response = await fetch(`${this.apiBase}/jobs/applications/?job=${jobId}`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });
            
            if (response.ok) {
                const proposals = await response.json();
                if (proposals.length === 0) {
                    this.showAlert('No proposals received yet for this job.', 'info');
                } else {
                    // Display proposals (you could create a modal or separate section)
                    let proposalText = 'Proposals for this job:\n\n';
                    proposals.forEach(proposal => {
                        proposalText += `Provider: ${proposal.provider_name || proposal.provider}\n`;
                        proposalText += `Proposal: ${proposal.proposal}\n`;
                        proposalText += `Status: ${proposal.status}\n\n`;
                    });
                    alert(proposalText);
                }
            } else {
                this.showAlert('Failed to load proposals.', 'error');
            }
        } catch (error) {
            console.error('Error loading proposals:', error);
            this.showAlert('Network error. Please check your connection.', 'error');
        }
    }

    messageProvider(providerId) {
        // Redirect to chat with provider
        window.location.href = `../chat/chat.html?provider=${providerId}`;
    }

    async leaveReview(jobId) {
        const rating = prompt('Please rate this job (1-5 stars):');
        if (rating && rating >= 1 && rating <= 5) {
            const comment = prompt('Please leave a comment for your review:');
            if (comment) {
                try {
                    // First get the job to find the provider
                    const jobResponse = await fetch(`${this.apiBase}/jobs/${jobId}/`, {
                        headers: {
                            'Authorization': `Token ${this.token}`
                        }
                    });
                    
                    if (jobResponse.ok) {
                        const job = await jobResponse.json();
                        if (job.provider) {
                            const reviewData = {
                                provider: job.provider,
                                job: jobId,
                                rating: parseInt(rating),
                                comment: comment
                            };
                            
                            const response = await fetch(`${this.apiBase}/services/providers/${job.provider}/reviews/`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Token ${this.token}`
                                },
                                body: JSON.stringify(reviewData)
                            });
                            
                            if (response.ok) {
                                this.showAlert('Review submitted successfully!', 'success');
                            } else {
                                this.showAlert('Failed to submit review.', 'error');
                            }
                        } else {
                            this.showAlert('No provider assigned to this job.', 'error');
                        }
                    } else {
                        this.showAlert('Failed to load job information.', 'error');
                    }
                } catch (error) {
                    console.error('Error submitting review:', error);
                    this.showAlert('Network error. Please check your connection.', 'error');
                }
            }
        } else {
            this.showAlert('Please enter a valid rating between 1 and 5.', 'error');
        }
    }

    async repostJob(jobId) {
        if (confirm('Are you sure you want to repost this job? This will create a new job with the same details.')) {
            try {
                // Get the original job data
                const response = await fetch(`${this.apiBase}/jobs/${jobId}/`, {
                    headers: {
                        'Authorization': `Token ${this.token}`
                    }
                });
                
                if (response.ok) {
                    const originalJob = await response.json();
                    const newJobData = {
                        title: originalJob.title,
                        category: originalJob.category,
                        description: originalJob.description,
                        budget: originalJob.budget,
                        urgency: originalJob.urgency,
                        location: originalJob.location,
                        start_date: originalJob.start_date
                    };
                    
                    // Create new job
                    const createResponse = await fetch(`${this.apiBase}/jobs/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Token ${this.token}`
                        },
                        body: JSON.stringify(newJobData)
                    });
                    
                    if (createResponse.ok) {
                        this.showAlert('Job reposted successfully!', 'success');
                        this.loadMyJobs();
                        this.loadStats();
                    } else {
                        this.showAlert('Failed to repost job.', 'error');
                    }
                } else {
                    this.showAlert('Failed to load original job data.', 'error');
                }
            } catch (error) {
                console.error('Error reposting job:', error);
                this.showAlert('Network error. Please check your connection.', 'error');
            }
        }
    }

    async viewProvider(providerId) {
        try {
            const response = await fetch(`${this.apiBase}/services/providers/${providerId}/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });
            
            if (response.ok) {
                const provider = await response.json();
                // Display provider details (you could create a modal or redirect to a profile page)
                let providerInfo = `Provider Profile\n\n`;
                providerInfo += `Name: ${provider.business_name || provider.username}\n`;
                providerInfo += `Email: ${provider.email}\n`;
                providerInfo += `Phone: ${provider.phone || 'Not provided'}\n`;
                providerInfo += `Location: ${provider.location || 'Not provided'}\n`;
                providerInfo += `Rating: ${provider.average_rating || 'No rating'}\n`;
                providerInfo += `Completed Jobs: ${provider.completed_jobs || 0}\n`;
                providerInfo += `Services: ${provider.services.map(s => s.name).join(', ')}\n`;
                
                alert(providerInfo);
            } else {
                this.showAlert('Failed to load provider information.', 'error');
            }
        } catch (error) {
            console.error('Error loading provider information:', error);
            this.showAlert('Network error. Please check your connection.', 'error');
        }
    }

    logout() {
        console.log('Logging out customer dashboard');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '../auth.html';
    }
}

// Global function for section switching
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.dashboard-nav .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    // Add active class to clicked nav link
    event.target.classList.add('active');
    
    // Load section-specific data
    const customerDashboard = window.customerDashboard;
    if (customerDashboard) {
        switch (sectionName) {
            case 'find-providers':
                customerDashboard.searchProviders();
                break;
            case 'my-jobs':
                customerDashboard.loadMyJobs();
                break;
            case 'reviews':
                customerDashboard.loadReviews();
                break;
        }
    }
}

// Initialize customer dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.customerDashboard = new CustomerDashboard();
});

// Global logout function
function logout() {
    if (window.customerDashboard) {
        window.customerDashboard.logout();
    }
}
