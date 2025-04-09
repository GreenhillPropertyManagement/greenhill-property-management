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
        const eventDate = new Date(event.calendar_date.split('T')[0]);
        return eventDate.getFullYear() === currentDate.getFullYear() &&
          eventDate.getMonth() === currentDate.getMonth();
      });

      filteredEvents.forEach(event => {
        let eventTemplate;

        if (event.is_task) {
          eventTemplate = document.querySelector('.calendar-event-sample-wrapper [data-dyn-item="task-event"]').cloneNode(true);

          eventTemplate.setAttribute('element', 'modal');
          eventTemplate.setAttribute('modal', 'update-task');

          eventTemplate.querySelector('[data-task="title"]').textContent = event.task_title;
          eventTemplate.querySelector('[data-task="user"]').textContent = event.assigned_user_name.display_name;
          eventTemplate.querySelector('[data-task="date"]').textContent = formatDateNoTime(event.calendar_date);

          // Store task data
          $(eventTemplate).data('task', {
            id: event.id,
            calendar_date: event.calendar_date,
            task_title: event.task_title,
            task_message: event.task_message,
            assigned_to_user: event.assigned_to_user,
            display_name: event.assigned_user_name.display_name
          });

          // Click to open modal and populate form
          $(eventTemplate).on('click', function () {
            const task = $(this).data('task');
            const $form = $('[data-api-form="update-task"]');
            window.selectedTaskId = task.id;

            $form.find('[data-api-input="calendar_date"]').val(task.calendar_date || '');
            $form.find('[data-api-input="task_title"]').val(task.task_title || '');
            $form.find('[data-api-input="task_message"]').val(task.task_message || '');

            const $userSelect = $form.find('[data-api-input="assigned_to_user"]');
            if ($userSelect.find(`option[value="${task.assigned_to_user}"]`).length === 0) {
              $userSelect.append(
                $('<option>', {
                  value: task.assigned_to_user,
                  text: task.display_name,
                  selected: true
                })
              );
            } else {
              $userSelect.val(task.assigned_to_user);
            }
          });

        } else {
          eventTemplate = document.querySelector('.calendar-event-sample-wrapper [data-dyn-item="calendar-event"]').cloneNode(true);
          eventTemplate.querySelector('[data-calendar="type"]').textContent = event.type;
          eventTemplate.querySelector('[data-calendar="tenant_name"]').textContent = event.display_name;
          eventTemplate.querySelector('[data-calendar="property_name"]').textContent = event.street;
          eventTemplate.querySelector('[data-calendar="unit_name"]').textContent = event.unit_name;
          eventTemplate.querySelector('[data-calendar="date"]').textContent = formatDateNoTime(event.calendar_date);
        }

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
          const eventDate = new Date(event.calendar_date.split('T')[0]);
          return eventDate.getFullYear() === date.getFullYear() &&
            eventDate.getMonth() === date.getMonth() &&
            eventDate.getDate() === date.getDate();
        });

        for (const event of eventsForDay) {
          let eventTemplate;

          if (event.is_task) {
            eventTemplate = document.querySelector('.calendar-event-sample-wrapper [data-dyn-item="task-event"]').cloneNode(true);

            eventTemplate.setAttribute('element', 'modal');
            eventTemplate.setAttribute('modal', 'update-task');

            eventTemplate.querySelector('[data-task="title"]').textContent = event.task_title;
            eventTemplate.querySelector('[data-task="user"]').textContent = event.assigned_user_name.display_name;
            eventTemplate.querySelector('[data-task="date"]').textContent = formatDateNoTime(event.calendar_date);

            $(eventTemplate).data('task', {
              id: event.id,
              calendar_date: event.calendar_date,
              task_title: event.task_title,
              task_message: event.task_message,
              assigned_to_user: event.assigned_to_user,
              display_name: event.assigned_user_name.display_name
            });

            $(eventTemplate).on('click', function () {
              const task = $(this).data('task');
              const $form = $('[data-api-form="update-task"]');
              window.selectedTaskId = task.id;

              $form.find('[data-api-input="calendar_date"]').val(task.calendar_date || '');
              $form.find('[data-api-input="task_title"]').val(task.task_title || '');
              $form.find('[data-api-input="task_message"]').val(task.task_message || '');

              const $userSelect = $form.find('[data-api-input="assigned_to_user"]');
              if ($userSelect.find(`option[value="${task.assigned_to_user}"]`).length === 0) {
                $userSelect.append(
                  $('<option>', {
                    value: task.assigned_to_user,
                    text: task.display_name,
                    selected: true
                  })
                );
              } else {
                $userSelect.val(task.assigned_to_user);
              }
            });

          } else {
            eventTemplate = document.querySelector('.calendar-event-sample-wrapper [data-dyn-item="calendar-event"]').cloneNode(true);
            eventTemplate.querySelector('[data-calendar="type"]').textContent = event.type;
            eventTemplate.querySelector('[data-calendar="tenant_name"]').textContent = event.display_name;
            eventTemplate.querySelector('[data-calendar="property_name"]').textContent = event.street;
            eventTemplate.querySelector('[data-calendar="unit_name"]').textContent = event.unit_name;
          }

          $(eventTemplate).on('click', function () {
            $(this).find('.calendar__event__info-wrapper').toggle();
          });

          if (date.getMonth() !== currentDate.getMonth()) {
            dayDiv.classList.add('inactive');
          }

          dayDiv.appendChild(eventTemplate);
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