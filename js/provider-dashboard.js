// FixMate - Provider Dashboard JavaScript

class ProviderDashboard {
    constructor() {
        this.apiBase = '/api';
        this.currentUser = null;
        this.token = localStorage.getItem('auth_token');
        this.currentServices = [];
        this.currentJobs = [];
        this.currentProposals = [];
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
        // Profile form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileUpdate();
            });
        }

        // Add service form
        const addServiceForm = document.getElementById('add-service-form');
        if (addServiceForm) {
            addServiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddService();
            });
        }

        // Profile image upload
        const profileImageInput = document.getElementById('profile-image');
        if (profileImageInput) {
            profileImageInput.addEventListener('change', (e) => {
                this.handleProfileImageUpload(e);
            });
        }

        // Job filters
        const myJobsFilter = document.getElementById('my-jobs-status-filter');
        if (myJobsFilter) {
            myJobsFilter.addEventListener('change', () => {
                this.loadMyJobs();
            });
        }

        // Proposal filters
        const proposalFilter = document.getElementById('proposal-status-filter');
        if (proposalFilter) {
            proposalFilter.addEventListener('change', () => {
                this.loadProposals();
            });
        }

        // Job search
        const jobSearch = document.getElementById('job-search');
        if (jobSearch) {
            jobSearch.addEventListener('input', this.debounce(() => {
                this.searchJobs();
            }, 500));
        }

        // Job filter changes
        const jobFilters = ['job-category-filter', 'job-location-filter', 'job-budget-filter'];
        jobFilters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => {
                    this.searchJobs();
                });
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
        const navMenu = document.querySelector('.nav-menu');

        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                hamburger.classList.toggle('active');
            });
        }
    }

    async checkAuthentication() {
        if (!this.token) {
            window.location.href = '../auth.html';
            return;
        }

        try {
            console.log('Provider dashboard checking authentication with token:', this.token);
            
            // First get basic user profile
            const userResponse = await fetch(`${this.apiBase}/auth/users/profile/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });
            console.log('User profile response status:', userResponse.status);

            if (userResponse.ok) {
                const userData = await userResponse.json();
                console.log('User profile data:', userData);
                
                if (userData.user_type !== 'provider') {
                    console.log('Access denied: user is not a provider');
                    this.showAlert('Access denied. Provider account required.', 'error');
                    window.location.href = '../index.html';
                    return;
                }
                
                // Now get provider profile
                try {
                    const providerResponse = await fetch(`${this.apiBase}/services/providers/me/`, {
                        headers: {
                            'Authorization': `Token ${this.token}`
                        }
                    });
                    console.log('Provider profile response status:', providerResponse.status);
                    
                    if (providerResponse.ok) {
                        const providerData = await providerResponse.json();
                        console.log('Provider profile data:', providerData);
                        
                        // Merge user and provider data
                        this.currentUser = {
                            ...userData,
                            ...providerData,
                            business_name: providerData.business_name || '',
                            service_area: providerData.service_area || '',
                            experience_years: providerData.experience_years || 0,
                            categories: providerData.categories || []
                        };
                        
                        console.log('Merged provider user data:', this.currentUser);
                        this.updateUI();
                    } else {
                        // If provider profile doesn't exist yet, use basic user data
                        this.currentUser = userData;
                        console.log('Provider profile not found, using basic user data');
                        this.updateUI();
                    }
                } catch (providerError) {
                    console.error('Error fetching provider profile:', providerError);
                    // Use basic user data if provider profile fetch fails
                    this.currentUser = userData;
                    this.updateUI();
                }
            } else {
                console.log('User authentication failed');
                this.logout();
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.logout();
        }
    }

    updateUI() {
        console.log('Provider dashboard updateUI called with currentUser:', this.currentUser);
        
        // Update user name in navigation
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && this.currentUser) {
            const displayName = this.currentUser.business_name || this.currentUser.username;
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
            this.loadRecentActivity(),
            this.loadUpcomingJobs(),
            this.loadServices(),
            this.loadMyJobs(),
            this.loadProposals(),
            this.loadReviews(),
            this.loadEarnings()
        ]);
    }

    async loadStats() {
        try {
            const response = await fetch(`${this.apiBase}/jobs/provider/stats/`, {
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

        if (activeJobsCount) activeJobsCount.textContent = stats.active_jobs || 0;
        if (completedJobsCount) completedJobsCount.textContent = stats.completed_jobs || 0;
        if (pendingProposalsCount) pendingProposalsCount.textContent = stats.pending_proposals || 0;
    }

    async loadRecentActivity() {
        const recentActivityList = document.getElementById('recent-activity-list');
        if (!recentActivityList) return;

        try {
            const response = await fetch(`${this.apiBase}/activities/recent/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const activities = await response.json();
                this.renderRecentActivity(activities);
            } else {
                recentActivityList.innerHTML = '<p class="text-center">No recent activity.</p>';
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
            recentActivityList.innerHTML = '<p class="text-center">Unable to load activity.</p>';
        }
    }

    renderRecentActivity(activities) {
        const recentActivityList = document.getElementById('recent-activity-list');
        if (!recentActivityList) return;

        if (activities.length === 0) {
            recentActivityList.innerHTML = '<p class="text-center">No recent activity.</p>';
            return;
        }

        recentActivityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.description}</p>
                    <small>${this.formatDate(activity.created_at)}</small>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'job_completed': 'check-circle',
            'proposal_accepted': 'handshake',
            'new_message': 'message',
            'job_started': 'play-circle',
            'review_received': 'star'
        };
        return icons[type] || 'info-circle';
    }

    async loadUpcomingJobs() {
        const upcomingJobsList = document.getElementById('upcoming-jobs-list');
        if (!upcomingJobsList) return;

        try {
            const response = await fetch(`${this.apiBase}/jobs/provider/upcoming/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const jobs = await response.json();
                this.renderUpcomingJobs(jobs);
            } else {
                upcomingJobsList.innerHTML = '<p class="text-center">No upcoming jobs.</p>';
            }
        } catch (error) {
            console.error('Error loading upcoming jobs:', error);
            upcomingJobsList.innerHTML = '<p class="text-center">Unable to load upcoming jobs.</p>';
        }
    }

    renderUpcomingJobs(jobs) {
        const upcomingJobsList = document.getElementById('upcoming-jobs-list');
        if (!upcomingJobsList) return;

        if (jobs.length === 0) {
            upcomingJobsList.innerHTML = '<p class="text-center">No upcoming jobs.</p>';
            return;
        }

        upcomingJobsList.innerHTML = jobs.map(job => `
            <div class="upcoming-job-card">
                <div class="job-header">
                    <h4>${job.title}</h4>
                    <span class="job-date">${this.formatDate(job.start_date)}</span>
                </div>
                <div class="job-details">
                    <p><strong>Customer:</strong> ${job.customer_name}</p>
                    <p><strong>Location:</strong> ${job.location}</p>
                    <p><strong>Budget:</strong> $${job.budget || 'Not specified'}</p>
                </div>
                <div class="job-actions">
                    <button class="btn btn-primary" onclick="providerDashboard.viewJobDetails(${job.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-outline" onclick="providerDashboard.messageCustomer(${job.customer_id})">
                        <i class="fas fa-message"></i> Message
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadServices() {
        const servicesList = document.getElementById('services-list');
        if (!servicesList) return;

        try {
            const response = await fetch(`${this.apiBase}/services/my_services/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                this.currentServices = await response.json();
                this.renderServices();
            } else {
                servicesList.innerHTML = '<p class="text-center">No services found.</p>';
            }
        } catch (error) {
            console.error('Error loading services:', error);
            servicesList.innerHTML = '<p class="text-center">Unable to load services.</p>';
        }
    }

    renderServices() {
        const servicesList = document.getElementById('services-list');
        if (!servicesList) return;

        if (this.currentServices.length === 0) {
            servicesList.innerHTML = '<p class="text-center">No services added yet.</p>';
            return;
        }

        servicesList.innerHTML = this.currentServices.map(service => `
            <div class="service-card">
                <div class="service-header">
                    <h3>${service.title}</h3>
                    <div class="service-actions">
                        <button class="btn btn-outline" onclick="providerDashboard.editService(${service.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-error" onclick="providerDashboard.deleteService(${service.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn btn-outline" onclick="providerDashboard.toggleFeatured(${service.id})">
                            <i class="fas fa-star${service.is_featured ? '' : '-o'}"></i>
                            ${service.is_featured ? 'Featured' : 'Feature'}
                        </button>
                    </div>
                </div>
                <div class="service-details">
                    <p><strong>Category:</strong> ${service.category_name}</p>
                    <div class="service-price">
                        ${service.price.toLocaleString()} CFA ${service.price_type}
                        ${service.estimated_duration ? `<span class="service-duration">• ${service.estimated_duration}</span>` : ''}
                    </div>
                    <p><strong>Status:</strong> <span class="status-badge ${service.status}">${service.status}</span></p>
                    <p>${service.description}</p>
                    ${service.requirements ? `<p><strong>Requirements:</strong> ${service.requirements}</p>` : ''}
                </div>
            </div>
        `).join('');
    }

    async handleAddService() {
        const form = document.getElementById('add-service-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Get form data
        const formData = new FormData(form);
        const serviceData = {
            title: formData.get('title'),
            category: parseInt(formData.get('category')),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            price_type: formData.get('price_type'),
            estimated_duration: formData.get('estimated_duration') || '',
            requirements: formData.get('requirements') || ''
        };

        this.showLoading(submitBtn, 'Add Service');
        
        try {
            const response = await fetch(`${this.apiBase}/services/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${this.token}`
                },
                body: JSON.stringify(serviceData)
            });
            
            if (response.ok) {
                const service = await response.json();
                this.currentServices.push(service);
                this.renderServices();
                this.closeAddServiceModal();
                form.reset();
                this.showAlert('Service added successfully!', 'success');
            } else {
                const error = await response.json();
                console.error('Service creation error:', error);
                this.showAlert(`Failed to add service: ${JSON.stringify(error)}`, 'error');
            }
        } catch (error) {
            console.error('Service addition error:', error);
            this.showAlert('Failed to add service. Please check your connection.', 'error');
        } finally {
            this.hideLoading(submitBtn, 'Add Service');
        }
    }

    async searchJobs() {
        const availableJobsList = document.getElementById('available-jobs-list');
        if (!availableJobsList) return;

        const search = document.getElementById('job-search')?.value || '';
        const category = document.getElementById('job-category-filter')?.value || '';
        const location = document.getElementById('job-location-filter')?.value || '';
        const budget = document.getElementById('job-budget-filter')?.value || '';

        try {
            let url = `${this.apiBase}/jobs/available/?`;
            const params = new URLSearchParams();
            
            if (search) params.append('search', search);
            if (category) params.append('category', category);
            if (location) params.append('location', location);
            if (budget) params.append('budget_range', budget);
            
            url += params.toString();

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const jobs = await response.json();
                this.renderAvailableJobs(jobs);
            } else {
                availableJobsList.innerHTML = '<p class="text-center">No available jobs found.</p>';
            }
        } catch (error) {
            console.error('Error searching jobs:', error);
            availableJobsList.innerHTML = '<p class="text-center">Unable to search jobs.</p>';
        }
    }

    renderAvailableJobs(jobs) {
        const availableJobsList = document.getElementById('available-jobs-list');
        if (!availableJobsList) return;

        if (jobs.length === 0) {
            availableJobsList.innerHTML = '<p class="text-center">No available jobs found.</p>';
            return;
        }

        availableJobsList.innerHTML = jobs.map(job => `
            <div class="available-job-card">
                <div class="job-header">
                    <h3>${job.title}</h3>
                    <span class="job-budget">$${job.budget || 'Budget not specified'}</span>
                </div>
                <div class="job-details">
                    <p><strong>Category:</strong> ${this.formatCategory(job.category)}</p>
                    <p><strong>Location:</strong> ${job.location}</p>
                    <p><strong>Urgency:</strong> ${job.urgency || 'Medium'}</p>
                    <p>${job.description}</p>
                </div>
                <div class="job-meta">
                    <span><i class="fas fa-calendar"></i> Posted ${this.formatDate(job.created_at)}</span>
                    <span><i class="fas fa-clock"></i> ${job.proposals_count || 0} proposals</span>
                </div>
                <div class="job-actions">
                    <button class="btn btn-primary" onclick="providerDashboard.submitProposal(${job.id})">
                        <i class="fas fa-paper-plane"></i> Submit Proposal
                    </button>
                    <button class="btn btn-outline" onclick="providerDashboard.viewJobDetails(${job.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadMyJobs() {
        const myJobsList = document.getElementById('my-jobs-list');
        if (!myJobsList) return;

        const statusFilter = document.getElementById('my-jobs-status-filter')?.value || '';

        try {
            let url = `${this.apiBase}/jobs/provider/`;
            if (statusFilter) {
                url += `?status=${statusFilter}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                this.currentJobs = await response.json();
                this.renderMyJobs();
            } else {
                myJobsList.innerHTML = '<p class="text-center">No jobs found.</p>';
            }
        } catch (error) {
            console.error('Error loading my jobs:', error);
            myJobsList.innerHTML = '<p class="text-center">Unable to load jobs.</p>';
        }
    }

    renderMyJobs() {
        const myJobsList = document.getElementById('my-jobs-list');
        if (!myJobsList) return;

        if (this.currentJobs.length === 0) {
            myJobsList.innerHTML = '<p class="text-center">No jobs found.</p>';
            return;
        }

        myJobsList.innerHTML = this.currentJobs.map(job => `
            <div class="my-job-card">
                <div class="job-header">
                    <h3>${job.title}</h3>
                    <span class="job-status status-${job.status}">${this.formatStatus(job.status)}</span>
                </div>
                <div class="job-details">
                    <p><strong>Customer:</strong> ${job.customer_name}</p>
                    <p><strong>Location:</strong> ${job.location}</p>
                    <p><strong>Budget:</strong> $${job.budget || 'Not specified'}</p>
                    <p>${job.description}</p>
                </div>
                <div class="job-meta">
                    <span><i class="fas fa-calendar"></i> Started ${this.formatDate(job.start_date)}</span>
                    <span><i class="fas fa-dollar-sign"></i> ${job.proposed_amount || 'Amount not set'}</span>
                </div>
                <div class="job-actions">
                    ${this.renderJobActions(job)}
                </div>
            </div>
        `).join('');
    }

    renderJobActions(job) {
        let actions = '';

        switch (job.status) {
            case 'accepted':
                actions = `
                    <button class="btn btn-primary" onclick="providerDashboard.startJob(${job.id})">
                        <i class="fas fa-play"></i> Start Job
                    </button>
                    <button class="btn btn-outline" onclick="providerDashboard.messageCustomer(${job.customer_id})">
                        <i class="fas fa-message"></i> Message
                    </button>
                `;
                break;
            case 'in_progress':
                actions = `
                    <button class="btn btn-primary" onclick="providerDashboard.completeJob(${job.id})">
                        <i class="fas fa-check"></i> Complete Job
                    </button>
                    <button class="btn btn-outline" onclick="providerDashboard.messageCustomer(${job.customer_id})">
                        <i class="fas fa-message"></i> Message
                    </button>
                `;
                break;
            case 'completed':
                actions = `
                    <button class="btn btn-outline" onclick="providerDashboard.viewJobDetails(${job.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-outline" onclick="providerDashboard.messageCustomer(${job.customer_id})">
                        <i class="fas fa-message"></i> Message
                    </button>
                `;
                break;
            default:
                actions = `
                    <button class="btn btn-outline" onclick="providerDashboard.viewJobDetails(${job.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-outline" onclick="providerDashboard.messageCustomer(${job.customer_id})">
                        <i class="fas fa-message"></i> Message
                    </button>
                `;
        }

        return actions;
    }

    async loadProposals() {
        const proposalsList = document.getElementById('proposals-list');
        if (!proposalsList) return;

        const statusFilter = document.getElementById('proposal-status-filter')?.value || '';

        try {
            let url = `${this.apiBase}/proposals/provider/`;
            if (statusFilter) {
                url += `?status=${statusFilter}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                this.currentProposals = await response.json();
                this.renderProposals();
            } else {
                proposalsList.innerHTML = '<p class="text-center">No proposals found.</p>';
            }
        } catch (error) {
            console.error('Error loading proposals:', error);
            proposalsList.innerHTML = '<p class="text-center">Unable to load proposals.</p>';
        }
    }

    renderProposals() {
        const proposalsList = document.getElementById('proposals-list');
        if (!proposalsList) return;

        if (this.currentProposals.length === 0) {
            proposalsList.innerHTML = '<p class="text-center">No proposals found.</p>';
            return;
        }

        proposalsList.innerHTML = this.currentProposals.map(proposal => `
            <div class="proposal-card">
                <div class="proposal-header">
                    <h3>${proposal.job_title}</h3>
                    <span class="proposal-status status-${proposal.status}">${this.formatStatus(proposal.status)}</span>
                </div>
                <div class="proposal-details">
                    <p><strong>Customer:</strong> ${proposal.customer_name}</p>
                    <p><strong>Proposed Amount:</strong> $${proposal.proposed_amount}</p>
                    <p><strong>Estimated Duration:</strong> ${proposal.estimated_duration}</p>
                    <p>${proposal.description}</p>
                </div>
                <div class="proposal-meta">
                    <span><i class="fas fa-calendar"></i> Submitted ${this.formatDate(proposal.created_at)}</span>
                </div>
            </div>
        `).join('');
    }

    async loadReviews() {
        const reviewsList = document.getElementById('reviews-list');
        if (!reviewsList) return;

        try {
            const response = await fetch(`${this.apiBase}/reviews/provider/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const reviewsData = await response.json();
                this.updateReviewsSummary(reviewsData);
                this.renderReviews(reviewsData.reviews || []);
            } else {
                reviewsList.innerHTML = '<p class="text-center">No reviews found.</p>';
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
            reviewsList.innerHTML = '<p class="text-center">Unable to load reviews.</p>';
        }
    }

    updateReviewsSummary(reviewsData) {
        const averageRating = document.getElementById('average-rating');
        const averageStars = document.getElementById('average-stars');
        const totalReviews = document.getElementById('total-reviews');
        const responseRate = document.getElementById('response-rate');
        const onTimeRate = document.getElementById('on-time-rate');

        if (averageRating) averageRating.textContent = reviewsData.average_rating || '0';
        if (averageStars) averageStars.innerHTML = this.renderStars(reviewsData.average_rating || 0);
        if (totalReviews) totalReviews.textContent = `(${reviewsData.total_reviews || 0} reviews)`;
        if (responseRate) responseRate.textContent = `${reviewsData.response_rate || 0}%`;
        if (onTimeRate) onTimeRate.textContent = `${reviewsData.on_time_rate || 0}%`;
    }

    renderReviews(reviews) {
        const reviewsList = document.getElementById('reviews-list');
        if (!reviewsList) return;

        if (reviews.length === 0) {
            reviewsList.innerHTML = '<p class="text-center">No reviews yet.</p>';
            return;
        }

        reviewsList.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <div>
                        <strong>${review.customer_name}</strong>
                        <div class="review-rating">
                            ${this.renderStars(review.rating)}
                        </div>
                    </div>
                    <span class="review-date">${this.formatDate(review.created_at)}</span>
                </div>
                <p class="review-comment">${review.comment}</p>
                ${review.job_title ? `<small class="review-job">For job: ${review.job_title}</small>` : ''}
            </div>
        `).join('');
    }

    async loadProfileData() {
        if (!this.currentUser) return;

        // Populate profile form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            document.getElementById('business-name').value = this.currentUser.business_name || '';
            document.getElementById('first-name').value = this.currentUser.first_name || '';
            document.getElementById('last-name').value = this.currentUser.last_name || '';
            document.getElementById('email').value = this.currentUser.email || '';
            document.getElementById('phone').value = this.currentUser.phone || '';
            document.getElementById('location').value = this.currentUser.location || '';
            document.getElementById('bio').value = this.currentUser.bio || '';
            document.getElementById('experience-years').value = this.currentUser.experience_years || 0;
            document.getElementById('availability').value = this.currentUser.is_available ? 'true' : 'false';
            document.getElementById('certifications').value = this.currentUser.certifications?.join(', ') || '';
            
            // Update profile image
            const profileImagePreview = document.getElementById('profile-image-preview');
            if (profileImagePreview && this.currentUser.profile_image) {
                profileImagePreview.src = this.currentUser.profile_image;
            }
        }
    }

    async handleProfileUpdate() {
        const form = document.getElementById('profile-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Get form data
        const formData = new FormData(form);
        const profileData = {
            business_name: formData.get('business_name'),
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            location: formData.get('location'),
            bio: formData.get('bio'),
            experience_years: parseInt(formData.get('experience_years')),
            is_available: formData.get('is_available') === 'true',
            certifications: formData.get('certifications').split(',').map(s => s.trim()).filter(s => s)
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

    async handleProfileImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profile_image', file);

        try {
            const response = await fetch(`${this.apiBase}/auth/users/upload-profile-image/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${this.token}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                const profileImagePreview = document.getElementById('profile-image-preview');
                if (profileImagePreview) {
                    profileImagePreview.src = data.profile_image;
                }
                this.showAlert('Profile image updated successfully!', 'success');
            } else {
                this.showAlert('Failed to upload profile image.', 'error');
            }
        } catch (error) {
            console.error('Profile image upload error:', error);
            this.showAlert('Network error. Please check your connection.', 'error');
        }
    }

    // Action methods
    submitProposal(jobId) {
        // Implementation for submitting a proposal
        console.log('Submit proposal for job:', jobId);
        this.showAlert('Submit proposal functionality coming soon!', 'info');
    }

    viewJobDetails(jobId) {
        // Implementation for viewing job details
        console.log('View job details:', jobId);
        this.showAlert('View job details functionality coming soon!', 'info');
    }

    messageCustomer(customerId) {
        // Redirect to chat with customer
        window.location.href = `../chat/chat.html?customer=${customerId}`;
    }

    startJob(jobId) {
        if (confirm('Are you sure you want to start this job?')) {
            // Implementation for starting a job
            console.log('Start job:', jobId);
            this.showAlert('Start job functionality coming soon!', 'info');
        }
    }

    completeJob(jobId) {
        if (confirm('Are you sure you want to mark this job as completed?')) {
            // Implementation for completing a job
            console.log('Complete job:', jobId);
            this.showAlert('Complete job functionality coming soon!', 'info');
        }
    }

    async editService(serviceId) {
        const service = this.currentServices.find(s => s.id === serviceId);
        if (!service) return;
        
        // For now, show alert - in future, implement edit modal
        this.showAlert('Edit service functionality coming soon!', 'info');
    }

    async deleteService(serviceId) {
        if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/services/${serviceId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });
            
            if (response.ok) {
                this.currentServices = this.currentServices.filter(s => s.id !== serviceId);
                this.renderServices();
                this.showAlert('Service deleted successfully!', 'success');
            } else {
                this.showAlert('Failed to delete service. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Service deletion error:', error);
            this.showAlert('Failed to delete service. Please check your connection.', 'error');
        }
    }
    
    async toggleFeatured(serviceId) {
        try {
            const response = await fetch(`${this.apiBase}/services/${serviceId}/toggle_featured/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                const service = this.currentServices.find(s => s.id === serviceId);
                if (service) {
                    service.is_featured = result.is_featured;
                    this.renderServices();
                    this.showAlert(`Service ${result.is_featured ? 'featured' : 'unfeatured'} successfully!`, 'success');
                }
            } else {
                this.showAlert('Failed to toggle featured status. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Toggle featured error:', error);
            this.showAlert('Failed to toggle featured status. Please check your connection.', 'error');
        }
    }

    async loadCategories() {
        try {
            // Load provider's profile to get their registered categories
            const profileResponse = await fetch(`${this.apiBase}/services/providers/me/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });
            
            if (profileResponse.ok) {
                const profile = await profileResponse.json();
                this.categories = profile.categories || [];
                this.populateCategoryDropdown();
            } else {
                console.error('Failed to load provider profile');
                // Fallback: load all categories
                const categoriesResponse = await fetch(`${this.apiBase}/services/categories/`);
                if (categoriesResponse.ok) {
                    this.categories = await categoriesResponse.json();
                    this.populateCategoryDropdown();
                }
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }
    
    populateCategoryDropdown() {
        const categorySelect = document.getElementById('service-category');
        if (!categorySelect) return;
        
        // Clear existing options
        categorySelect.innerHTML = '';
        
        if (this.categories && this.categories.length > 0) {
            // If provider has categories, show only those and pre-select the first one
            this.categories.forEach((category, index) => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                if (index === 0) {
                    option.selected = true; // Pre-select the first category
                }
                categorySelect.appendChild(option);
            });
        } else {
            // Fallback: load all categories
            categorySelect.innerHTML = '<option value="">Select category</option>';
        }
    }
    
    async showAddServiceModal() {
        const modal = document.getElementById('add-service-modal');
        if (modal) {
            // Load categories if not already loaded
            if (!this.categories) {
                await this.loadCategories();
            }
            modal.style.display = 'block';
        }
    }

    closeAddServiceModal() {
        const modal = document.getElementById('add-service-modal');
        if (modal) {
            modal.style.display = 'none';
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

    logout() {
        console.log('Logging out provider dashboard');
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
    const providerDashboard = window.providerDashboard;
    if (providerDashboard) {
        switch (sectionName) {
            case 'find-jobs':
                providerDashboard.searchJobs();
                break;
            case 'my-jobs':
                providerDashboard.loadMyJobs();
                break;
            case 'proposals':
                providerDashboard.loadProposals();
                break;
            case 'reviews':
                providerDashboard.loadReviews();
                break;
        }
    }
}

// Global functions
function searchJobs() {
    if (window.providerDashboard) {
        window.providerDashboard.searchJobs();
    }
}

function closeAddServiceModal() {
    if (window.providerDashboard) {
        window.providerDashboard.closeAddServiceModal();
    }
}

// Initialize provider dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.providerDashboard = new ProviderDashboard();
});

// Global logout function
function logout() {
    if (window.providerDashboard) {
        window.providerDashboard.logout();
    }
}
