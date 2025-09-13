// FixMate - Reviews & Ratings JavaScript

class ReviewsManager {
    constructor() {
        this.apiBase = '/api';
        this.currentUser = null;
        this.token = localStorage.getItem('auth_token');
        this.currentReviews = [];
        this.pendingReviews = [];
        this.receivedReviews = [];
        this.completedJobs = [];
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.loadInitialData();
        this.setupMobileMenu();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Review form
        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleReviewSubmit();
            });
        }

        // Rating inputs
        this.setupRatingInputs();

        // Filter controls
        const myReviewsFilter = document.getElementById('my-reviews-filter');
        if (myReviewsFilter) {
            myReviewsFilter.addEventListener('change', () => {
                this.filterMyReviews();
            });
        }

        // Cancel review button
        const cancelReviewBtn = document.getElementById('cancel-review');
        if (cancelReviewBtn) {
            cancelReviewBtn.addEventListener('click', () => {
                this.resetReviewForm();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    setupRatingInputs() {
        // Overall rating
        const overallRating = document.getElementById('overall-rating');
        if (overallRating) {
            overallRating.addEventListener('click', (e) => {
                if (e.target.classList.contains('fa-star')) {
                    this.setRating(overallRating, parseInt(e.target.dataset.rating));
                    document.getElementById('overall-rating-value').value = e.target.dataset.rating;
                }
            });
        }

        // Aspect ratings
        document.querySelectorAll('.aspect-rating .rating-input').forEach(ratingInput => {
            ratingInput.addEventListener('click', (e) => {
                if (e.target.classList.contains('fa-star')) {
                    this.setRating(ratingInput, parseInt(e.target.dataset.rating));
                    const hiddenInput = ratingInput.parentElement.querySelector('input[type="hidden"]');
                    hiddenInput.value = e.target.dataset.rating;
                }
            });
        });
    }

    setRating(container, rating) {
        const stars = container.querySelectorAll('.fa-star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('far');
                star.classList.add('fas', 'active');
            } else {
                star.classList.remove('fas', 'active');
                star.classList.add('far');
            }
        });
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
            window.location.href = 'auth.html';
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/auth/users/profile/`, {
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
        // Update user name in navigation if needed
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && this.currentUser) {
            userNameElement.textContent = this.currentUser.business_name || this.currentUser.username;
        }
    }

    async loadInitialData() {
        await Promise.all([
            this.loadMyReviews(),
            this.loadPendingReviews(),
            this.loadReceivedReviews(),
            this.loadCompletedJobs()
        ]);
    }

    async loadMyReviews() {
        const myReviewsList = document.getElementById('my-reviews-list');
        if (!myReviewsList) return;

        this.showLoading(myReviewsList);

        try {
            const response = await fetch(`${this.apiBase}/reviews/my-reviews/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                this.currentReviews = await response.json();
                this.renderMyReviews();
            } else {
                myReviewsList.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><h3>No Reviews Yet</h3><p>You haven\'t written any reviews yet.</p></div>';
            }
        } catch (error) {
            console.error('Error loading my reviews:', error);
            myReviewsList.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Reviews</h3><p>Please try again later.</p></div>';
        }
    }

    renderMyReviews() {
        const myReviewsList = document.getElementById('my-reviews-list');
        if (!myReviewsList) return;

        if (this.currentReviews.length === 0) {
            myReviewsList.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><h3>No Reviews Yet</h3><p>You haven\'t written any reviews yet.</p></div>';
            return;
        }

        myReviewsList.innerHTML = this.currentReviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <div class="review-info">
                        <h4>${review.provider_name}</h4>
                        <p class="job-title">${review.job_title}</p>
                    </div>
                    <div class="review-rating">
                        ${this.renderStars(review.rating)}
                    </div>
                </div>
                <div class="review-meta">
                    <span class="review-date">${this.formatDate(review.created_at)}</span>
                    <span class="review-recommendation ${review.recommend ? 'recommend-yes' : 'recommend-no'}">
                        <i class="fas fa-${review.recommend ? 'thumbs-up' : 'thumbs-down'}"></i>
                        ${review.recommend ? 'Recommended' : 'Not Recommended'}
                    </span>
                </div>
                <div class="review-comment">${review.comment}</div>
                <div class="review-actions">
                    <button class="btn btn-outline btn-small" onclick="reviewsManager.viewReviewDetails(${review.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-outline btn-small" onclick="reviewsManager.editReview(${review.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadPendingReviews() {
        const pendingReviewsList = document.getElementById('pending-reviews-list');
        if (!pendingReviewsList) return;

        this.showLoading(pendingReviewsList);

        try {
            const response = await fetch(`${this.apiBase}/reviews/pending-reviews/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                this.pendingReviews = await response.json();
                this.renderPendingReviews();
            } else {
                pendingReviewsList.innerHTML = '<div class="empty-state"><i class="fas fa-clock"></i><h3>No Pending Reviews</h3><p>All your completed jobs have been reviewed.</p></div>';
            }
        } catch (error) {
            console.error('Error loading pending reviews:', error);
            pendingReviewsList.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Reviews</h3><p>Please try again later.</p></div>';
        }
    }

    renderPendingReviews() {
        const pendingReviewsList = document.getElementById('pending-reviews-list');
        if (!pendingReviewsList) return;

        if (this.pendingReviews.length === 0) {
            pendingReviewsList.innerHTML = '<div class="empty-state"><i class="fas fa-clock"></i><h3>No Pending Reviews</h3><p>All your completed jobs have been reviewed.</p></div>';
            return;
        }

        pendingReviewsList.innerHTML = this.pendingReviews.map(job => `
            <div class="pending-review-card">
                <div class="pending-review-header">
                    <div class="pending-review-info">
                        <h4>${job.provider_name}</h4>
                        <p class="job-date">Completed on ${this.formatDate(job.completed_at)}</p>
                    </div>
                </div>
                <div class="pending-review-details">
                    <p><strong>Job:</strong> ${job.title}</p>
                    <p><strong>Amount Paid:</strong> $${job.amount}</p>
                </div>
                <div class="pending-review-actions">
                    <button class="btn btn-primary btn-small" onclick="reviewsManager.writeReviewForJob(${job.id})">
                        <i class="fas fa-star"></i> Write Review
                    </button>
                    <button class="btn btn-outline btn-small" onclick="reviewsManager.viewJobDetails(${job.id})">
                        <i class="fas fa-eye"></i> View Job
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadReceivedReviews() {
        const receivedReviewsList = document.getElementById('received-reviews-list');
        const ratingSummary = document.getElementById('rating-summary');
        if (!receivedReviewsList || !ratingSummary) return;

        this.showLoading(receivedReviewsList);

        try {
            const response = await fetch(`${this.apiBase}/reviews/received-reviews/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.receivedReviews = data.reviews || [];
                this.updateRatingSummary(data.summary || {});
                this.renderReceivedReviews();
            } else {
                receivedReviewsList.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><h3>No Reviews Received</h3><p>You haven\'t received any reviews yet.</p></div>';
            }
        } catch (error) {
            console.error('Error loading received reviews:', error);
            receivedReviewsList.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Reviews</h3><p>Please try again later.</p></div>';
        }
    }

    updateRatingSummary(summary) {
        const ratingSummary = document.getElementById('rating-summary');
        if (!ratingSummary) return;

        ratingSummary.innerHTML = `
            <div class="rating-stat">
                <h3>${summary.average_rating || '0.0'}</h3>
                <p>Average Rating</p>
            </div>
            <div class="rating-stat">
                <h3>${summary.total_reviews || '0'}</h3>
                <p>Total Reviews</p>
            </div>
            <div class="rating-stat">
                <h3>${summary.recommendation_rate || '0'}%</h3>
                <p>Recommendation Rate</p>
            </div>
            <div class="rating-stat">
                <h3>${summary.response_rate || '0'}%</h3>
                <p>Response Rate</p>
            </div>
        `;
    }

    renderReceivedReviews() {
        const receivedReviewsList = document.getElementById('received-reviews-list');
        if (!receivedReviewsList) return;

        if (this.receivedReviews.length === 0) {
            receivedReviewsList.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><h3>No Reviews Received</h3><p>You haven\'t received any reviews yet.</p></div>';
            return;
        }

        receivedReviewsList.innerHTML = this.receivedReviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <div class="review-info">
                        <h4>${review.customer_name}</h4>
                        <p class="job-title">${review.job_title}</p>
                    </div>
                    <div class="review-rating">
                        ${this.renderStars(review.rating)}
                    </div>
                </div>
                <div class="review-meta">
                    <span class="review-date">${this.formatDate(review.created_at)}</span>
                    <span class="review-recommendation ${review.recommend ? 'recommend-yes' : 'recommend-no'}">
                        <i class="fas fa-${review.recommend ? 'thumbs-up' : 'thumbs-down'}"></i>
                        ${review.recommend ? 'Recommended' : 'Not Recommended'}
                    </span>
                </div>
                <div class="review-comment">${review.comment}</div>
                <div class="review-actions">
                    <button class="btn btn-outline btn-small" onclick="reviewsManager.viewReviewDetails(${review.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-outline btn-small" onclick="reviewsManager.respondToReview(${review.id})">
                        <i class="fas fa-reply"></i> Respond
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadCompletedJobs() {
        const jobSelect = document.getElementById('job-select');
        if (!jobSelect) return;

        try {
            const response = await fetch(`${this.apiBase}/jobs/completed/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                this.completedJobs = await response.json();
                this.populateJobSelect();
            }
        } catch (error) {
            console.error('Error loading completed jobs:', error);
        }
    }

    populateJobSelect() {
        const jobSelect = document.getElementById('job-select');
        if (!jobSelect) return;

        // Clear existing options except the first one
        jobSelect.innerHTML = '<option value="">Choose a completed job...</option>';

        this.completedJobs.forEach(job => {
            const option = document.createElement('option');
            option.value = job.id;
            option.textContent = `${job.title} - ${job.provider_name} (${this.formatDate(job.completed_at)})`;
            jobSelect.appendChild(option);
        });
    }

    async handleReviewSubmit() {
        const form = document.getElementById('review-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Get form data
        const formData = new FormData(form);
        const reviewData = {
            job: formData.get('job-select'),
            rating: parseInt(document.getElementById('overall-rating-value').value),
            quality_rating: parseInt(formData.get('quality_rating')),
            communication_rating: parseInt(formData.get('communication_rating')),
            timeliness_rating: parseInt(formData.get('timeliness_rating')),
            value_rating: parseInt(formData.get('value_rating')),
            comment: formData.get('comment'),
            recommend: formData.get('recommend') === 'yes'
        };

        // Validate required fields
        if (!reviewData.job || !reviewData.rating || !reviewData.comment) {
            this.showAlert('Please fill in all required fields.', 'error');
            return;
        }

        // Show loading state
        this.showLoading(submitBtn, 'Submit Review');

        try {
            const response = await fetch(`${this.apiBase}/reviews/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${this.token}`
                },
                body: JSON.stringify(reviewData)
            });

            if (response.ok) {
                const review = await response.json();
                this.showAlert('Review submitted successfully!', 'success');
                this.resetReviewForm();
                
                // Refresh data
                await this.loadMyReviews();
                await this.loadPendingReviews();
                
                // Switch to my reviews tab
                this.switchTab('my-reviews');
            } else {
                const error = await response.json();
                this.showAlert('Failed to submit review. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Review submission error:', error);
            this.showAlert('Network error. Please check your connection.', 'error');
        } finally {
            this.hideLoading(submitBtn, 'Submit Review');
        }
    }

    resetReviewForm() {
        const form = document.getElementById('review-form');
        if (form) {
            form.reset();
            
            // Reset rating inputs
            document.querySelectorAll('.rating-input').forEach(ratingInput => {
                this.setRating(ratingInput, 0);
            });
        }
    }

    // Action methods
    viewReviewDetails(reviewId) {
        const review = this.findReviewById(reviewId);
        if (!review) return;

        const modal = document.getElementById('review-detail-modal');
        const content = document.getElementById('review-detail-content');
        
        content.innerHTML = `
            <div class="review-detail-header">
                <div class="review-detail-info">
                    <h4>${review.provider_name || review.customer_name}</h4>
                    <p class="job-title">${review.job_title}</p>
                </div>
                <div class="review-detail-rating">
                    <div class="rating-score">${review.rating}</div>
                    <div>${this.renderStars(review.rating)}</div>
                </div>
            </div>
            
            <div class="review-detail-meta">
                <div class="review-detail-meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>Reviewed on ${this.formatDate(review.created_at)}</span>
                </div>
                <div class="review-detail-meta-item">
                    <i class="fas fa-${review.recommend ? 'thumbs-up' : 'thumbs-down'}"></i>
                    <span class="${review.recommend ? 'recommend-yes' : 'recommend-no'}">
                        ${review.recommend ? 'Recommended' : 'Not Recommended'}
                    </span>
                </div>
            </div>
            
            <div class="review-detail-aspects">
                <h5>Detailed Ratings</h5>
                <div class="review-detail-aspect">
                    <span class="review-detail-aspect-name">Quality of Work</span>
                    <div class="review-detail-aspect-rating">
                        ${this.renderStars(review.quality_rating || 0)}
                    </div>
                </div>
                <div class="review-detail-aspect">
                    <span class="review-detail-aspect-name">Communication</span>
                    <div class="review-detail-aspect-rating">
                        ${this.renderStars(review.communication_rating || 0)}
                    </div>
                </div>
                <div class="review-detail-aspect">
                    <span class="review-detail-aspect-name">Timeliness</span>
                    <div class="review-detail-aspect-rating">
                        ${this.renderStars(review.timeliness_rating || 0)}
                    </div>
                </div>
                <div class="review-detail-aspect">
                    <span class="review-detail-aspect-name">Value for Money</span>
                    <div class="review-detail-aspect-rating">
                        ${this.renderStars(review.value_rating || 0)}
                    </div>
                </div>
            </div>
            
            <div class="review-detail-comment">
                ${review.comment}
            </div>
        `;
        
        modal.style.display = 'block';
    }

    editReview(reviewId) {
        // Implementation for editing a review
        console.log('Edit review:', reviewId);
        this.showAlert('Edit review functionality coming soon!', 'info');
    }

    writeReviewForJob(jobId) {
        // Switch to write review tab and pre-select the job
        this.switchTab('write-review');
        
        const jobSelect = document.getElementById('job-select');
        if (jobSelect) {
            jobSelect.value = jobId;
        }
    }

    viewJobDetails(jobId) {
        // Implementation for viewing job details
        console.log('View job details:', jobId);
        this.showAlert('View job details functionality coming soon!', 'info');
    }

    respondToReview(reviewId) {
        // Implementation for responding to a review
        console.log('Respond to review:', reviewId);
        this.showAlert('Respond to review functionality coming soon!', 'info');
    }

    // Utility methods
    findReviewById(reviewId) {
        return this.currentReviews.find(r => r.id === reviewId) ||
               this.receivedReviews.find(r => r.id === reviewId);
    }

    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Add active class to clicked tab button
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Load tab-specific data
        switch (tabName) {
            case 'my-reviews':
                this.loadMyReviews();
                break;
            case 'pending-reviews':
                this.loadPendingReviews();
                break;
            case 'received-reviews':
                this.loadReceivedReviews();
                break;
            case 'write-review':
                this.loadCompletedJobs();
                break;
        }
    }

    filterMyReviews() {
        const filter = document.getElementById('my-reviews-filter').value;
        let filteredReviews = [...this.currentReviews];
        
        switch (filter) {
            case 'recent':
                filteredReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'highest':
                filteredReviews.sort((a, b) => b.rating - a.rating);
                break;
            case 'lowest':
                filteredReviews.sort((a, b) => a.rating - b.rating);
                break;
        }
        
        this.currentReviews = filteredReviews;
        this.renderMyReviews();
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

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    showLoading(element, originalText = 'Loading...') {
        if (element.tagName === 'BUTTON') {
            element.disabled = true;
            element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        } else {
            element.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> ${originalText}</div>`;
        }
    }

    hideLoading(element, originalText) {
        if (element.tagName === 'BUTTON') {
            element.disabled = false;
            element.textContent = originalText;
        }
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        // Insert at the top of the reviews container
        const reviewsContainer = document.querySelector('.reviews-container');
        if (reviewsContainer) {
            reviewsContainer.insertBefore(alertDiv, reviewsContainer.firstChild);
        }
        
        // Remove after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = 'index.html';
    }
}

// Global functions
function closeReviewDetailModal() {
    const modal = document.getElementById('review-detail-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Initialize reviews manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.reviewsManager = new ReviewsManager();
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('review-detail-modal');
    if (event.target === modal) {
        closeReviewDetailModal();
    }
});
