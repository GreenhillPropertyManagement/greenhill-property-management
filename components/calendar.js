document.addEventListener("DOMContentLoaded", function() { 

  $('#calendar').click(function(){
    calendarInit();
  });
  

});


function calendarInit() {

    const calendarTitle = document.querySelector('.calendar__title');
    const prevMonthBtn = document.querySelector('#prev-month');
    const nextMonthBtn = document.querySelector('#next-month');
    const calendarBody = document.querySelector('.calendar__body');
    let currentDate = new Date();
  
    function isMobileDevice() {
        return window.innerWidth <= 768;
    }
  
    function loadCalendarEvents() {
        $('.loader').css('display', 'flex');
        $.ajax({
            url: localStorage.baseUrl + "api:WyD5t-ws/get_calendar_events",
            type: "GET",
            headers: {
                'Authorization': "Bearer " + localStorage.authToken
            },
            success: function (response) {
                generateCalendar(response);
            },
            complete: function () {
                $('.loader').hide();
            },
            error: function (error) {
                console.error(error);
                $('.loader').hide();
            }
        });
    }
  
    function generateCalendar(events) {
        calendarBody.innerHTML = '';
        calendarTitle.textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const daysInPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
        const startDayOfWeek = firstDay.getDay();
  
        const dates = [];
        for (let i = daysInPrevMonth - startDayOfWeek + 1; i <= daysInPrevMonth; i++) {
            dates.push(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, i));
        }
        for (let i = 1; i <= daysInMonth; i++) {
            dates.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
        }
        for (let i = 1; i <= 7 - lastDay.getDay() - 1; i++) {
            dates.push(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i));
        }
  
        if (isMobileDevice()) {
            const filteredEvents = events.filter(event => {
                const eventDate = new Date(event.calendar_date);
                return eventDate.getFullYear() === currentDate.getFullYear() &&
                    eventDate.getMonth() === currentDate.getMonth();
            });
  
            filteredEvents.forEach(event => {
                const eventTemplate = document.querySelector('.calendar-event-sample-wrapper [data-dyn-item="calendar-event"]').cloneNode(true);
  
                // Set attributes and content based on task or regular event
                if (event.is_task) {
                    eventTemplate.setAttribute('element', 'modal');
                    eventTemplate.setAttribute('modal', 'new-task');
                    eventTemplate.querySelector('[data-calendar="type"]').textContent = event.task_title;
                } else {
                    eventTemplate.querySelector('[data-calendar="type"]').textContent = event.type;
                }
  
                eventTemplate.querySelector('[data-calendar="tenant_name"]').textContent = event.display_name;
                eventTemplate.querySelector('[data-calendar="property_name"]').textContent = event.street;
                eventTemplate.querySelector('[data-calendar="unit_name"]').textContent = event.unit_name;
                eventTemplate.querySelector('[data-calendar="date"]').textContent = formatDateNoTime(event.calendar_date);
  
                $(eventTemplate).on('click', function () {
                    $(this).find('.calendar__event__info-wrapper').toggle();
                });
  
                calendarBody.appendChild(eventTemplate);
            });
        } else {
            for (const date of dates) {
                const dayDiv = document.querySelector('.calendar__day').cloneNode(true);
                const dayNumber = dayDiv.querySelector('.calendar__day__number');
                dayNumber.textContent = date.getDate();
  
                const eventsForDay = events.filter(event => {
                    const eventDate = new Date(event.calendar_date);
                    return eventDate.getFullYear() === date.getFullYear() &&
                        eventDate.getMonth() === date.getMonth() &&
                        eventDate.getDate() === date.getDate();
                });
  
                for (const event of eventsForDay) {
                    const eventTemplate = document.querySelector('.calendar-event-sample-wrapper [data-dyn-item="calendar-event"]').cloneNode(true);
  
                    // Set attributes and content based on task or regular event
                    if (event.is_task) {
                        eventTemplate.setAttribute('element', 'modal');
                        eventTemplate.setAttribute('modal', 'new-task');
                        eventTemplate.querySelector('[data-calendar="type"]').textContent = event.task_title;
                    } else {
                        eventTemplate.querySelector('[data-calendar="type"]').textContent = event.type;
                    }
  
                    eventTemplate.querySelector('[data-calendar="tenant_name"]').textContent = event.display_name;
                    eventTemplate.querySelector('[data-calendar="property_name"]').textContent = event.street;
                    eventTemplate.querySelector('[data-calendar="unit_name"]').textContent = event.unit_name;
  
                    $(eventTemplate).on('click', function () {
                        $(this).find('.calendar__event__info-wrapper').toggle();
                    });
  
                    dayDiv.appendChild(eventTemplate);
                }
  
                if (date.getMonth() !== currentDate.getMonth()) {
                    dayDiv.classList.add('inactive');
                }
                calendarBody.appendChild(dayDiv);
            }
        }
    }
  
    loadCalendarEvents();
  
    prevMonthBtn.addEventListener('click', () => {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        loadCalendarEvents();
    });
  
    nextMonthBtn.addEventListener('click', () => {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        loadCalendarEvents();
    });
  }