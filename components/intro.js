document.addEventListener("DOMContentLoaded", function () {

  const hasSeenIntro = localStorage.getItem("introInitiated");
  const role = localStorage.getItem('userRole');
  const userRecId = localStorage.getItem('userRecId');

  if (hasSeenIntro !== "true") {
    // user has NOT seen the intro, so show it automatically
    if (role === 'Tenant' && userRecId === '272') {
      startTenantIntro();
    } else if (role === 'Landlord' && userRecId === '270') {
      startLandlordIntro();
    }
  }

  // Manual trigger (always works regardless of localStorage)
  $('.intro-button').on('click', function () {
    if (role === 'Tenant' && userRecId === '272') {
      startTenantIntro();
    } else if (role === 'Landlord' && userRecId === '270') {
      startLandlordIntro();
    }
  });
});



// Tenant Tour
function startTenantIntro() {
    markWalkthroughInitiated();
    const intro = introJs();

    intro.setOptions({
        steps: [
            {
        element: document.getElementById('tenant-dashboard-header'),
        intro: `
            <img src="https://cdn.prod.website-files.com/64ef87a21e6d1b3957b7416b/6566c4276cfe72177e7df971_256.png" class="intro-img" alt="Intro Icon" />
            <h2 class="intro-heading">Get to Know Your Dashboard</h2>
            <p class="intro-subheading">We’ll show you around and help you get comfortable.</p>
        `,
        position: 'bottom'
    },
    {
        element: document.getElementById('notifications'),
        intro: 'Here is where your notifications will appear, showing you all recent activity on your account.',
        position: 'left'
    },
    {
        element: document.getElementById('my-profile'),
        intro: 'This is your profile section. Here, you can view the latest activity on your account, your unit information, lease details, and contact information.',
        position: 'right'
    },
    {
        element: document.getElementById('pay-rent'),
        intro: 'Here, you can pay your rent and view your transaction ledger to see all charges, payments, and credits posted to your account.',
        position: 'right'
    },
    {
        element: document.getElementById('maintenance'),
        intro: 'In the Maintenance section, you can create or view maintenance requests and work orders for your unit.',
        position: 'right'
    },
    {
        element: document.getElementById('communications'),
        intro: 'In the Communications section, you can chat and view conversations with property managers.',
        position: 'right'
    },
    {
        element: document.getElementById('documents'),
        intro: 'In the Documents section, you can upload and view documents related to your lease or unit.',
        position: 'right'
    },
    {
        element: document.getElementById('profile-settings'),
        intro: 'In Profile Settings, you can update your contact and billing information, change your bank account, and update your password.',
        position: 'right'
    }
        ],
        showStepNumbers: true,
        exitOnOverlayClick: true,
        disableInteraction: false,
        scrollToElement: true,
    });

    intro.onbeforechange(function(targetElement) {
        if (targetElement.id === 'my-profile') {
            document.getElementById('my-profile').click();
        }
        if (targetElement.id === 'pay-rent') {
            document.getElementById('pay-rent').click();
        }
        if (targetElement.id === 'maintenance') {
            document.getElementById('maintenance').click();
        }
        if (targetElement.id === 'communications') {
            document.getElementById('communications').click();
        }
        if (targetElement.id === 'documents') {
            document.getElementById('documents').click();
        }
        if (targetElement.id === 'profile-settings') {
            document.getElementById('profile-settings').click();
        }

        // (Optional) If your tabs need time to load/render
        // you can add a slight delay here if necessary
    });

    intro.start();
}

// Landlord Tour
function startLandlordIntro() {

    markWalkthroughInitiated();
    const intro = introJs();

    intro.setOptions({
        steps: [
            {
    element: document.getElementById('tenant-dashboard-header'),
    intro: `
        <img src="https://cdn.prod.website-files.com/64ef87a21e6d1b3957b7416b/6566c4276cfe72177e7df971_256.png" class="intro-img" alt="Intro Icon" />
        <h2 class="intro-heading">Get to Know Your Dashboard</h2>
        <p class="intro-subheading">We’ll show you around and help you get comfortable.</p>
    `,
    position: 'bottom'
    },
    {
        element: document.getElementById('notifications'),
        intro: 'Here is where your notifications will appear, showing you all recent activity on your account.',
        position: 'left'
    },
    {
        element: document.getElementById('dashboard'),
        intro: 'This is your dashboard, where you can see a quick snapshot of this month’s net operating income, recent activity on your account, property portfolio, communications, active tenants, and work orders.',
        position: 'right'
    },
    {
        element: document.getElementById('finance'),
        intro: 'The Portfolio Finance section gives you robust tools to analyze your finances and generate reports.',
        position: 'right'
    },
    {
        element: document.getElementById('properties'),
        intro: 'In the Properties section, you can view all of your properties currently under management.',
        position: 'right'
    },
    {
        element: document.getElementById('maintenance'),
        intro: 'In the Maintenance section, you can create or view maintenance requests and work orders for your properties.',
        position: 'right'
    },
    {
        element: document.getElementById('communications'),
        intro: 'In the Communications section, you can chat and view conversations with property managers and tenants.',
        position: 'right'
    },
    {
        element: document.getElementById('documents'),
        intro: 'In the Documents section, you can upload and view documents.',
        position: 'right'
    },
    {
        element: document.getElementById('calendar'),
        intro: 'In the Calendar section, you can view upcoming dates pertaining to lease starts, lease ends, rent increases, and more.',
        position: 'right'
    },
    {
        element: document.getElementById('profile-settings'),
        intro: 'In Profile Settings, you can update your contact and billing information, change your bank account, update your password, and manage which types of email alerts you wish to receive.',
        position: 'right'
    },
        ],
        showStepNumbers: true,
        exitOnOverlayClick: true,
        disableInteraction: false,
        scrollToElement: true,
    });

    intro.onbeforechange(function(targetElement) {
        if (targetElement.id === 'dashboard') {
            document.getElementById('dashboard').click();
        }
        if (targetElement.id === 'finance') {
            document.getElementById('finance').click();
        }
        if (targetElement.id === 'properties') {
            document.getElementById('properties').click();
        }
        if (targetElement.id === 'maintenance') {
            document.getElementById('maintenance').click();
        }
        if (targetElement.id === 'communications') {
            document.getElementById('communications').click();
        }
        if (targetElement.id === 'documents') {
            document.getElementById('documents').click();
        }
        if (targetElement.id === 'calendar') {
            document.getElementById('calendar').click();
        }
        if (targetElement.id === 'profile-settings') {
            document.getElementById('profile-settings').click();
        }

        // (Optional) If your tabs need time to load/render
        // you can add a slight delay here if necessary
    });

    intro.start();
}

function markWalkthroughInitiated() {
    $.ajax({
        url: localStorage.baseUrl + "api:sElUkr6t/walkthrough_initiated",
        method: "POST",
        headers: {
            "Authorization": "Bearer " + localStorage.authToken
        },
        contentType: "application/json",
        success: function(response) {

        },
        error: function(xhr, status, error) {

        }
    });
} 