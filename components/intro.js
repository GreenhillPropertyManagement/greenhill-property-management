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
      <h2 class="intro-heading">Welcome to Your Dashboard</h2>
      <p class="intro-subheading">We’ll take 30 seconds to show you around and help you get comfortable.</p>
    `,
    position: 'bottom'
  },
  {
    element: document.getElementById('tenant-bills-section'),
    intro: 'Here you can view and pay your bills.'
  }
],
    showStepNumbers: false,
    exitOnOverlayClick: true,
    disableInteraction: false
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

