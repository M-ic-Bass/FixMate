// FixMate - Providers Search JavaScript

class ProvidersSearch {
    constructor() {
        this.apiBase = '/api';
        this.currentProviders = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.viewMode = 'grid';
        this.searchTimeout = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCategories();
        this.loadFeaturedProviders();
        this.setupMobileMenu();
    }

    setupEventListeners() {
        // Search input with debounce
        const searchInput = document.getElementById('provider-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.searchProviders();
                }, 500);
            });
        }

        // Filter changes
        const filters = ['provider-category', 'provider-location', 'filter-min-price', 'filter-max-price', 'sort-by'];
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => {
                    this.searchProviders();
                });
            }
        });
        
        // Price range inputs with debounce
        const priceInputs = ['filter-min-price', 'filter-max-price'];
        priceInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', (e) => {
                    clearTimeout(this.searchTimeout);
                    this.searchTimeout = setTimeout(() => {
                        this.searchProviders();
                    }, 500);
                });
            }
        });

        // Search button
        const searchBtn = document.querySelector('.search-form button');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.searchProviders();
            });
        }

        // Enter key in search inputs
        const searchInputs = document.querySelectorAll('#provider-search, #provider-location');
        searchInputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.searchProviders();
                }
            });
        });

        // Modal close on outside click
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('provider-modal');
            if (e.target === modal) {
                this.closeProviderModal();
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

    async loadFeaturedProviders() {
        try {
            // Load featured services instead of providers
            const response = await fetch(`${this.apiBase}/services/featured/`);
            if (response.ok) {
                const services = await response.json();
                // Extract unique providers from featured services
                const providers = this.extractProvidersFromServices(services);
                this.renderProviders(providers);
                this.updateResultsCount(providers.length);
            } else {
                this.showNoProviders();
            }
        } catch (error) {
            console.error('Error loading featured providers:', error);
            this.showNoProviders();
        }
    }
    
    extractProvidersFromServices(services) {
        const providerMap = new Map();
        
        services.forEach(service => {
            if (service.provider && !providerMap.has(service.provider.id)) {
                providerMap.set(service.provider.id, {
                    ...service.provider,
                    services: services.filter(s => s.provider.id === service.provider.id)
                });
            }
        });
        
        return Array.from(providerMap.values());
    }

    async searchProviders(page = 1) {
        this.showLoading();
        this.currentPage = page;

        try {
            // Build query parameters for services
            const params = new URLSearchParams();
            
            // Search parameters
            const search = document.getElementById('provider-search')?.value.trim();
            const category = document.getElementById('provider-category')?.value;
            const minPrice = document.getElementById('filter-min-price')?.value;
            const maxPrice = document.getElementById('filter-max-price')?.value;
            const sortBy = document.getElementById('sort-by')?.value;

            if (search) params.append('search', search);
            if (category) params.append('category', category);
            if (minPrice) params.append('min_price', minPrice);
            if (maxPrice) params.append('max_price', maxPrice);
            if (sortBy) {
                switch(sortBy) {
                    case 'rating':
                        params.append('ordering', '-provider__rating');
                        break;
                    case 'price':
                        params.append('ordering', 'price');
                        break;
                    case 'recent':
                        params.append('ordering', '-created_at');
                        break;
                    default:
                        params.append('ordering', '-created_at');
                }
            }

            const response = await fetch(`${this.apiBase}/services/?${params.toString()}`);
            
            if (response.ok) {
                const services = await response.json();
                // Extract unique providers from services
                const providers = this.extractProvidersFromServices(services.results || services);
                this.currentProviders = providers;
                this.totalPages = Math.ceil((services.count || services.length) / 10);
                
                this.renderProviders(providers);
                this.updateResultsCount(providers.length);
                this.renderPagination();
            } else {
                this.showNoProviders();
            }
        } catch (error) {
            console.error('Error searching providers:', error);
            this.showNoProviders();
        } finally {
            this.hideLoading();
        }
    }

    renderProviders(providers) {
        const container = document.getElementById('providers-container');
        if (!container) return;

        if (providers.length === 0) {
            this.showNoProviders();
            return;
        }

        container.innerHTML = providers.map(provider => 
            this.viewMode === 'grid' ? this.renderProviderCard(provider) : this.renderProviderListItem(provider)
        ).join('');

        // Add click handlers for provider cards
        container.querySelectorAll('.provider-card, .provider-list-item').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons or links
                if (!e.target.closest('button, a')) {
                    const providerId = card.dataset.providerId;
                    this.showProviderDetails(providerId);
                }
            });
        });
    }

    renderProviderCard(provider) {
        return `
            <div class="provider-card" data-provider-id="${provider.id}">
                <div class="provider-header">
                    <img src="${provider.profile_image || 'images/default-avatar.png'}" 
                         alt="${provider.business_name || provider.username}" 
                         class="provider-avatar">
                    <div class="provider-info">
                        <h3>${provider.business_name || provider.username}</h3>
                        <div class="provider-rating">
                            ${this.renderStars(provider.average_rating || 0)}
                            <span>(${provider.review_count || 0} reviews)</span>
                        </div>
                    </div>
                </div>
                <div class="provider-services">
                    ${provider.services?.map(service => 
                        `<span class="service-tag">${service.title}</span>`
                    ).join('') || '<span class="service-tag">General Services</span>'}
                </div>
                <div class="provider-description">
                    <p>${provider.bio || 'Professional service provider with excellent customer satisfaction.'}</p>
                </div>
                <div class="provider-stats">
                    <div class="stat-item">
                        <i class="fas fa-check-circle"></i>
                        <span>${provider.completed_jobs || 0} Jobs</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${provider.experience_years || 0} Years</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${provider.location || 'Location not specified'}</span>
                    </div>
                </div>
                <div class="provider-actions">
                    <button class="btn btn-primary" onclick="event.stopPropagation(); providersSearch.showProviderDetails(${provider.id})">
                        <i class="fas fa-eye"></i> View Profile
                    </button>
                    <button class="btn btn-outline" onclick="event.stopPropagation(); providersSearch.contactProvider(${provider.id})">
                        <i class="fas fa-message"></i> Contact
                    </button>
                </div>
            </div>
        `;
    }

    renderProviderListItem(provider) {
        return `
            <div class="provider-list-item" data-provider-id="${provider.id}">
                <div class="provider-list-content">
                    <div class="provider-list-header">
                        <img src="${provider.profile_image || 'images/default-avatar.png'}" 
                             alt="${provider.business_name || provider.username}" 
                             class="provider-avatar">
                        <div class="provider-list-info">
                            <h3>${provider.business_name || provider.username}</h3>
                            <div class="provider-rating">
                                ${this.renderStars(provider.average_rating || 0)}
                                <span>(${provider.review_count || 0} reviews)</span>
                            </div>
                            <div class="provider-meta">
                                <span><i class="fas fa-check-circle"></i> ${provider.completed_jobs || 0} Jobs</span>
                                <span><i class="fas fa-calendar-alt"></i> ${provider.experience_years || 0} Years</span>
                                <span><i class="fas fa-map-marker-alt"></i> ${provider.location || 'Location not specified'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="provider-list-details">
                        <div class="provider-services">
                            ${provider.services?.map(service => 
                                `<span class="service-tag">${service.title}</span>`
                            ).join('') || '<span class="service-tag">General Services</span>'}
                        </div>
                        <p class="provider-description">${provider.bio || 'Professional service provider with excellent customer satisfaction.'}</p>
                    </div>
                </div>
                <div class="provider-list-actions">
                    <button class="btn btn-primary" onclick="event.stopPropagation(); providersSearch.showProviderDetails(${provider.id})">
                        <i class="fas fa-eye"></i> View Profile
                    </button>
                    <button class="btn btn-outline" onclick="event.stopPropagation(); providersSearch.contactProvider(${provider.id})">
                        <i class="fas fa-message"></i> Contact
                    </button>
                </div>
            </div>
        `;
    }

    async showProviderDetails(providerId) {
        const modal = document.getElementById('provider-modal');
        const detailsContainer = document.getElementById('provider-details');
        
        if (!modal || !detailsContainer) return;

        this.showLoadingInModal(detailsContainer);

        try {
            // Get provider details
            const providerResponse = await fetch(`${this.apiBase}/services/providers/${providerId}/`);
            // Get provider's services
            const servicesResponse = await fetch(`${this.apiBase}/services/?provider=${providerId}`);
            
            if (providerResponse.ok && servicesResponse.ok) {
                const provider = await providerResponse.json();
                const services = await servicesResponse.json();
                
                // Combine provider data with their services
                const providerWithServices = {
                    ...provider,
                    services: services.results || services
                };
                
                detailsContainer.innerHTML = this.renderProviderDetails(providerWithServices);
                modal.style.display = 'block';
            } else {
                detailsContainer.innerHTML = '<p class="error">Unable to load provider details.</p>';
            }
        } catch (error) {
            console.error('Error loading provider details:', error);
            detailsContainer.innerHTML = '<p class="error">Network error. Please try again.</p>';
        }
    }

    renderProviderDetails(provider) {
        return `
            <div class="provider-details">
                <div class="provider-details-header">
                    <img src="${provider.profile_image || 'images/default-avatar.png'}" 
                         alt="${provider.business_name || provider.username}" 
                         class="provider-avatar-large">
                    <div class="provider-details-info">
                        <h2>${provider.business_name || provider.username}</h2>
                        <div class="provider-rating">
                            ${this.renderStars(provider.average_rating || 0)}
                            <span>(${provider.review_count || 0} reviews)</span>
                        </div>
                        <div class="provider-status">
                            <span class="status-badge ${provider.is_available ? 'available' : 'busy'}">
                                ${provider.is_available ? 'Available' : 'Busy'}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="provider-details-section">
                    <h3>About</h3>
                    <p>${provider.bio || 'Professional service provider dedicated to delivering quality work and excellent customer service.'}</p>
                </div>

                <div class="provider-details-section">
                    <h3>Services</h3>
                    <div class="services-list">
                        ${provider.services?.map(service => `
                            <div class="service-item">
                                <h4>${service.title}</h4>
                                <p>${service.description || 'Professional service'}</p>
                                <div class="service-meta">
                                    <span class="service-price">${service.price.toLocaleString()} CFA ${service.price_type}</span>
                                    ${service.estimated_duration ? `<span class="service-duration">${service.estimated_duration}</span>` : ''}
                                </div>
                                ${service.requirements ? `<p class="service-requirements"><strong>Requirements:</strong> ${service.requirements}</p>` : ''}
                            </div>
                        `).join('') || '<p>No specific services listed.</p>'}
                    </div>
                </div>

                <div class="provider-details-section">
                    <h3>Experience & Qualifications</h3>
                    <div class="qualifications">
                        <div class="qualification-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${provider.experience_years || 0} years of experience</span>
                        </div>
                        <div class="qualification-item">
                            <i class="fas fa-check-circle"></i>
                            <span>${provider.completed_jobs || 0} jobs completed</span>
                        </div>
                        <div class="qualification-item">
                            <i class="fas fa-graduation-cap"></i>
                            <span>${provider.certifications?.join(', ') || 'No certifications listed'}</span>
                        </div>
                    </div>
                </div>

                <div class="provider-details-section">
                    <h3>Location & Availability</h3>
                    <div class="location-info">
                        <div class="location-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${provider.location || 'Location not specified'}</span>
                        </div>
                        <div class="location-item">
                            <i class="fas fa-clock"></i>
                            <span>Response time: ${provider.response_time || 'Within 24 hours'}</span>
                        </div>
                    </div>
                </div>

                <div class="provider-details-section">
                    <h3>Recent Reviews</h3>
                    <div class="reviews-preview">
                        ${provider.recent_reviews?.map(review => `
                            <div class="review-item">
                                <div class="review-header">
                                    <strong>${review.customer_name}</strong>
                                    <div class="review-rating">
                                        ${this.renderStars(review.rating)}
                                    </div>
                                </div>
                                <p class="review-text">${review.comment}</p>
                                <small class="review-date">${this.formatDate(review.created_at)}</small>
                            </div>
                        `).join('') || '<p>No reviews yet.</p>'}
                    </div>
                </div>

                <div class="provider-details-actions">
                    <button class="btn btn-primary" onclick="providersSearch.contactProvider(${provider.id})">
                        <i class="fas fa-message"></i> Contact Provider
                    </button>
                    <button class="btn btn-outline" onclick="providersSearch.bookProvider(${provider.id})">
                        <i class="fas fa-calendar-check"></i> Book Service
                    </button>
                    <button class="btn btn-outline" onclick="providersSearch.viewAllReviews(${provider.id})">
                        <i class="fas fa-star"></i> View All Reviews
                    </button>
                </div>
            </div>
        `;
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

    renderPagination() {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        if (this.totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `
                <button class="pagination-btn" onclick="providersSearch.searchProviders(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="providersSearch.searchProviders(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="providersSearch.searchProviders(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="providersSearch.searchProviders(${this.totalPages})">${this.totalPages}</button>`;
        }

        // Next button
        if (this.currentPage < this.totalPages) {
            paginationHTML += `
                <button class="pagination-btn" onclick="providersSearch.searchProviders(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        paginationContainer.innerHTML = paginationHTML;
    }

    updateResultsCount(count) {
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            resultsCount.textContent = `Found ${count} provider${count !== 1 ? 's' : ''}`;
        }
    }

    showNoProviders() {
        const container = document.getElementById('providers-container');
        if (container) {
            container.innerHTML = `
                <div class="no-providers">
                    <i class="fas fa-search"></i>
                    <h3>No providers found</h3>
                    <p>Try adjusting your search criteria or check back later for new providers.</p>
                    <button class="btn btn-outline" onclick="providersSearch.clearFilters()">Clear Filters</button>
                </div>
            `;
        }
        this.updateResultsCount(0);
    }

    showLoading() {
        const spinner = document.getElementById('loading-spinner');
        const container = document.getElementById('providers-container');
        if (spinner) spinner.style.display = 'block';
        if (container) container.style.opacity = '0.5';
    }

    hideLoading() {
        const spinner = document.getElementById('loading-spinner');
        const container = document.getElementById('providers-container');
        if (spinner) spinner.style.display = 'none';
        if (container) container.style.opacity = '1';
    }

    showLoadingInModal(container) {
        container.innerHTML = '<div class="spinner"></div>';
    }

    closeProviderModal() {
        const modal = document.getElementById('provider-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    contactProvider(providerId) {
        // Check if user is authenticated
        const token = localStorage.getItem('auth_token');
        if (!token) {
            alert('Please login to contact providers.');
            window.location.href = 'auth.html';
            return;
        }

        // Redirect to chat with provider
        window.location.href = `chat/chat.html?provider=${providerId}`;
    }

    bookProvider(providerId) {
        // Check if user is authenticated
        const token = localStorage.getItem('auth_token');
        if (!token) {
            alert('Please login to book services.');
            window.location.href = 'auth.html';
            return;
        }

        // Redirect to customer dashboard to post a job
        window.location.href = 'dashboard/customer.html?provider=${providerId}';
    }

    viewAllReviews(providerId) {
        // Implementation for viewing all reviews
        console.log('View all reviews for provider:', providerId);
        alert('View all reviews functionality coming soon!');
    }

    clearFilters() {
        // Reset all filters
        document.getElementById('provider-search').value = '';
        document.getElementById('provider-category').value = '';
        document.getElementById('provider-location').value = '';
        document.getElementById('filter-min-price').value = '';
        document.getElementById('filter-max-price').value = '';
        document.getElementById('sort-by').value = 'rating';
        
        // Reload featured providers
        this.loadFeaturedProviders();
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.apiBase}/services/categories/`);
            if (response.ok) {
                const categories = await response.json();
                this.populateCategoryDropdown(categories);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }
    
    populateCategoryDropdown(categories) {
        const categorySelect = document.getElementById('provider-category');
        if (!categorySelect) return;
        
        // Clear existing options except the first one
        while (categorySelect.children.length > 1) {
            categorySelect.removeChild(categorySelect.lastChild);
        }
        
        // Add category options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Global functions
function searchProviders() {
    if (window.providersSearch) {
        window.providersSearch.searchProviders(1);
    }
}

function setViewMode(mode) {
    if (window.providersSearch) {
        window.providersSearch.viewMode = mode;
        
        // Update button states
        document.querySelectorAll('.view-options .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Re-render providers
        window.providersSearch.renderProviders(window.providersSearch.currentProviders);
    }
}

function closeProviderModal() {
    if (window.providersSearch) {
        window.providersSearch.closeProviderModal();
    }
}

// Initialize providers search when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.providersSearch = new ProvidersSearch();
});
