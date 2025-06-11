document.addEventListener("DOMContentLoaded", function () {

  const role = localStorage.getItem('userRole');
  const userRecId = localStorage.getItem('userRecId');

  if (role === 'Tenant' && userRecId === '272') { // only for testing mode
    startTenantIntro();
  }

  // keep manual trigger if needed
  $('#start-tour-btn').on('click', function () {
    if (role === 'Tenant' && userRecId === '272') { // only for testing mode
      startTenantIntro();
    } else if (role === 'Landlord') {
      startLandlordIntro();
    }
  });

});



// Tenant Tour
function startTenantIntro() {
    const intro = introJs();

    intro.setOptions({
        steps: [
            {
                element: document.getElementById('tenant-dashboard-header'),
                intro: `
                    <img src="https://cdn.prod.website-files.com/64ef87a21e6d1b3957b7416b/6566c4276cfe72177e7df971_256.png" class="intro-img" alt="Intro Icon" />
                    <h2 class="intro-heading">Get To Know Your Dashboard</h2>
                    <p class="intro-subheading">We’ll show you around and help you get comfortable.</p>
                `,
                position: 'bottom'
            },
            {
                element: document.getElementById('my-profile'),
                intro: 'This is your profile section. Here you can view the latest activity on your account, your unit information, lease information, and contact information',
                position: 'right'
            },
            {
                element: document.getElementById('pay-rent'),
                intro: 'Here you can pay your rent, and view your transactions ledger to see all charges, payments and credits posted on your account.',
                position: 'right'
            },
            {
                element: document.getElementById('maintenance'),
                intro: 'In Maintenance, you can create and/or view maintenance requests/work orders for your unit.',
                position: 'right'
            },
            {
                element: document.getElementById('communications'),
                intro: 'In Communications, you can chat and view conversations with property managers',
                position: 'right'
            },
            {
                element: document.getElementById('profile-settings'),
                intro: 'In Profile Settings, you can update your contact and billing info, change your bank account, and update your password. ',
                position: 'right'
            },
        ],
        showStepNumbers: false,
        exitOnOverlayClick: true,
        disableInteraction: false,
        scrollToElement: true,
    });

    intro.onbeforechange(function(targetElement) {
        // Trigger click on #pay-rent right before we show it
        if (targetElement.id === 'pay-rent') {
            document.getElementById('pay-rent').click();
        }
        if (targetElement.id === 'maintenance') {
            document.getElementById('maintenance').click();
        }
        if (targetElement.id === 'communications') {
            document.getElementById('communications').click();
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
const intro = introJs();

intro.setOptions({
    steps: [
    {
        element: $('.landlord-dashboard-header')[0],
        intro: 'This is your landlord dashboard.',
        position: 'bottom'
    },
    {
        element: $('.property-list-section')[0],
        intro: 'Here you can manage your properties.'
    }
    ],
    showStepNumbers: false,
    exitOnOverlayClick: true,
    disableInteraction: false
});

intro.start();
}