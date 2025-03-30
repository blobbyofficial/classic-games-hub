// Function to handle errors and display an error message dynamically on the page
function handleError(errorMessage, errorType = 'General Error') {
    // Create an error message div
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error-message');
    errorDiv.textContent = `${errorType}: ${errorMessage}`;

    // Append the error message to the body
    document.body.appendChild(errorDiv);

    // Remove the error message after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Function to display error details on the error page (404, 500, etc.)
function handleErrorPage(errorCode, errorMessage, fixSuggestion) {
    // Set error details dynamically on the error page
    const errorTitle = document.getElementById('error-type');
    const errorDescription = document.getElementById('error-description');
    const errorFix = document.getElementById('error-fix');

    errorTitle.textContent = `Error ${errorCode}`;
    errorDescription.textContent = errorMessage;
    errorFix.textContent = fixSuggestion;

    // Log error for debugging purposes
    console.error(`Error ${errorCode}: ${errorMessage}`);
}

// Handle resource loading errors (images, JS, CSS)
function handleResourceLoadError(resourceType, resourceName) {
    const errorMsg = `${resourceType} failed to load: ${resourceName}`;
    handleError(errorMsg, `${resourceType} Load Error`);
}

// Handle page navigation error (if something goes wrong when navigating)
function handlePageNavigationError(url) {
    const errorMsg = `Failed to navigate to: ${url}`;
    handleError(errorMsg, 'Page Navigation Error');
}

// Handle external links navigation
function handleExternalLinkError(url) {
    const errorMsg = `Failed to navigate to external website: ${url}`;
    handleError(errorMsg, 'External Link Navigation Error');
}

// Handle favicon load error
const favicon = new Image();
favicon.src = 'assets/favicon.png';
favicon.onerror = function() {
    handleResourceLoadError('Favicon', 'assets/favicon.png');
};

// Handle CSS and JS file loading errors
function loadExternalResource(url, type) {
    const resource = type === 'css' ? document.createElement('link') : document.createElement('script');
    if (type === 'css') {
        resource.rel = 'stylesheet';
        resource.href = url;
    } else {
        resource.src = url;
    }
    
    resource.onload = () => console.log(`${type} file loaded successfully.`);
    resource.onerror = () => handleResourceLoadError(type.toUpperCase(), url);
    
    document.head.appendChild(resource);
}

// Preload important resources (CSS, JS, etc.)
loadExternalResource('css/index.css', 'css');
loadExternalResource('js/script.js', 'js');

// Event listener for page navigation via buttons or links
const links = document.querySelectorAll('a');
links.forEach(link => {
    link.addEventListener('click', function(event) {
        try {
            const targetUrl = link.getAttribute('href');
            if (targetUrl.startsWith('http')) {
                window.location.href = targetUrl;
            } else {
                window.location.href = targetUrl;
            }
        } catch (error) {
            handlePageNavigationError(link.getAttribute('href'));
        }
    });
});

// Event listener for navigating to external websites (example)
const externalLinks = document.querySelectorAll('.external-link');
externalLinks.forEach(link => {
    link.addEventListener('click', function(event) {
        try {
            const externalUrl = link.getAttribute('href');
            window.open(externalUrl, '_blank');
        } catch (error) {
            handleExternalLinkError(link.getAttribute('href'));
        }
    });
});

// Handling AJAX/Fetch Errors
function fetchData(url) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok (${response.status})`);
            }
            return response.json();
        })
        .then(data => console.log('Fetched data successfully', data))
        .catch(error => handleError(`Failed to fetch data from ${url}: ${error.message}`, 'AJAX Error'));
}

// Sample fetch call (for demonstration)
fetchData('https://api.example.com/data');

// Error handling for animations
function handleAnimationError(element, animationType) {
    try {
        if (!element) {
            throw new Error(`Element with animation type ${animationType} not found`);
        }
        console.log(`Animation "${animationType}" applied to element successfully`);
    } catch (error) {
        handleError(`Animation Error: ${error.message}`, 'Animation Handling Error');
    }
}

// Example animation error handling
const animatedElement = document.querySelector('.animate-element');
handleAnimationError(animatedElement, 'fade-in');

// Handling form submission errors
function handleFormSubmissionError(formId) {
    const form = document.getElementById(formId);
    form.addEventListener('submit', function(event) {
        try {
            // Simulate form submission logic
            if (form.checkValidity()) {
                console.log('Form submitted successfully');
            } else {
                throw new Error('Form validation failed');
            }
        } catch (error) {
            handleError(`Form submission error: ${error.message}`, 'Form Error');
            event.preventDefault(); // Prevent form submission on error
        }
    });
}

// Sample form handling (for demonstration)
handleFormSubmissionError('sample-form');
