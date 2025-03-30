// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80, // Adjusting for the navbar height
                behavior: 'smooth'
            });
        }
    });
});

// Form Validation (simple form handling)
function validateForm(formId) {
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input, select, textarea');
    let isValid = true;

    inputs.forEach(input => {
        if (input.required && input.value.trim() === '') {
            isValid = false;
            showError(input, `${input.name} is required`);
        } else {
            removeError(input);
        }
    });

    return isValid;
}

function showError(input, message) {
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error-message');
    errorDiv.textContent = message;

    input.classList.add('error');
    input.parentElement.appendChild(errorDiv);
}

function removeError(input) {
    input.classList.remove('error');
    const errorDiv = input.parentElement.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Event listener for form submissions
const forms = document.querySelectorAll('form');
forms.forEach(form => {
    form.addEventListener('submit', function (event) {
        if (!validateForm(form.id)) {
            event.preventDefault();  // Prevent form submission if validation fails
            handleError('Please fill out all required fields properly.', 'Form Validation Error');
        }
    });
});

// Button Click Alerts
const buttons = document.querySelectorAll('button');
buttons.forEach(button => {
    button.addEventListener('click', function () {
        alert(`Button ${button.textContent} clicked!`);
    });
});

// General Page Navigation and External Links
const externalLinks = document.querySelectorAll('a[href^="http"]');
externalLinks.forEach(link => {
    link.addEventListener('click', function (event) {
        event.preventDefault(); // Prevent the default navigation
        const confirmRedirect = confirm(`Are you sure you want to leave this page and go to ${link.href}?`);
        if (confirmRedirect) {
            window.location.href = link.href; // Navigate to the external link if confirmed
        }
    });
});

// Example for handling dynamically generated content (like AJAX-loaded items)
// This could be used for handling lists or game cards dynamically
function handleDynamicContentLoading() {
    const dynamicContent = document.querySelectorAll('.dynamic-content');
    dynamicContent.forEach(content => {
        content.addEventListener('click', function () {
            alert(`You clicked on a dynamic content item!`);
        });
    });
}

// Call the dynamic content handler
handleDynamicContentLoading();

// Example of an alert popup that triggers after certain time on page load (e.g., for promo or info)
window.addEventListener('load', function() {
    setTimeout(() => {
        alert("Welcome to Classic Games Hub! Check out our featured games!");
    }, 2000); // Alert after 2 seconds
});

// Handling "Back to Top" Button Visibility (if you have a back-to-top button on the page)
const backToTopButton = document.getElementById('back-to-top');
if (backToTopButton) {
    window.addEventListener('scroll', function () {
        if (window.scrollY > 300) {
            backToTopButton.style.display = 'block';
        } else {
            backToTopButton.style.display = 'none';
        }
    });

    backToTopButton.addEventListener('click', function () {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}
