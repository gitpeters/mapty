'use strict';

class Workout {
  id = (Date.now() + '').slice(-7) + Math.trunc(Math.random() * 3) + 1;
  date = new Date();
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run = new Running([9.0570752, 7.4481664], 5.2, 24, 178);
// const cycle = new Cycling([9.0570752, 7.4481664], 27, 95, 534);
// console.log(run, cycle);

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

///////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #editingWorkout = null;
  constructor() {
    // get user's position
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();
    form.addEventListener('submit', this._handleFormSubmit.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    document.addEventListener('DOMContentLoaded', this._loadDOMContent());
  }
  _getPosition() {
    // geolocation api
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
        console.log('Could not get your position')
      );
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // calling event-listener from leaflet
    this.#map.on('click', this._showForm.bind(this));
    // render each workout on the map
    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInput = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    const checkPositiveNumber = (...inputs) => inputs.every(input => input > 0);

    e.preventDefault();
    // get data from form
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout running, create running object
    if (type === 'running') {
      const cadence = Number(inputCadence.value);
      if (
        !validInput(distance, duration, cadence) ||
        !checkPositiveNumber(distance, duration, cadence)
      )
        return alert('Inputs have to be positive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // if workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = Number(inputElevation.value);
      if (
        !validInput(distance, duration, elevation) ||
        !checkPositiveNumber(distance, duration)
      )
        return alert('Inputs have to be positive number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add new object to workout array
    this.#workouts.push(workout);
    console.log(this.#workouts);
    // render workout on map as marker
    this._renderWorkoutMarker(workout);

    // render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // set local storage to all workout
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    console.log(this.#workouts);
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;
    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li> `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      workout => workout.id === workoutEl.dataset.id
    );
    console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  deleteWorkout(id) {
    // 1. Retrieve the workouts from the local storage
    const workouts = JSON.parse(localStorage.getItem('workouts'));
    if (!workouts) {
      console.log(`No workouts found in the db`);
    }
    // Find the index of thw workout to be deleted
    const index = workouts.findIndex(workout => workout.id === id);

    if (index !== -1) {
      // delete the workout
      workouts.splice(index, 1);
      // Resave the new workout lists
      localStorage.setItem('workouts', JSON.stringify(workouts));
      // Assign the save workouts to our workout list
      this.#workouts = workouts;
      location.reload();
      console.log('successfully delted workout');
    } else {
      console.log(`No workout found for this id: ${id}`);
    }
  }

  _handleFormSubmit(e) {
    e.preventDefault(); // Prevent the default form behavior

    if (this.#editingWorkout) {
      this._updateWorkout(this.#editingWorkout);
    } else {
      this._newWorkout(e); // Create a new workout
    }

    this._hideForm(); // Hide the form and clear the fields
  }

  editWorkout(id) {
    const workouts = JSON.parse(localStorage.getItem('workouts'));
    if (!workouts) {
      console.log('No workouts found in the db');
      return;
    }

    const contextMenu = document.querySelector('.context-menu');
    if (contextMenu) {
      contextMenu.style.display = 'none';
    }

    const index = workouts.findIndex(wk => wk.id === id);
    if (index === -1) {
      console.log(`No workout found for this ID: ${id}`);
      return;
    }

    const workout = workouts[index];
    form.classList.remove('hidden'); // Show the form for editing

    // Pre-fill the form fields with the workout data
    inputType.value = workout.type;
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;

    if (workout.type === 'cycling') {
      inputElevation.value = workout.elevationGain;
    }

    if (workout.type === 'running') {
      inputCadence.value = workout.cadence;
    }

    this.#editingWorkout = workout; // Set the reference to the workout being edited
    console.log(this.#editingWorkout);
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this.#workouts = data; // set the workout list to the data retrieved from the local storage. At every reload, the workout list will be populated with the data from the localstorage

    // render each workout
    this.#workouts.forEach(workout => this._renderWorkout(workout));
  }

  _updateWorkout(workout) {
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);

    if (workout.type !== type) {
      alert('Workout type cannot be edited');
      return;
    }
    workout.type = type;
    workout.distance = distance;
    workout.duration = duration;

    if (type === 'cycling') {
      workout.elevationGain = Number(inputElevation.value);
    } else if (type === 'running') {
      workout.cadence = Number(inputCadence.value);
    }

    const workouts = JSON.parse(localStorage.getItem('workouts')) || [];
    const index = workouts.findIndex(wk => wk.id === workout.id);

    if (index !== -1) {
      workouts[index] = workout; // Update the workout in the array
    }
    this.#workouts = workouts; // Update the internal list
    localStorage.setItem('workouts', JSON.stringify(workouts)); // Save changes to local storage
    console.log('Workout successfully updated');
    location.reload();
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _loadDOMContent() {
    const workoutList = document.querySelector('.workouts');

    // Double-click interval in milliseconds
    const doubleClickInterval = 300; // Adjust to your preference

    let lastClickTime = 0; // To track the last click time
    let currentWorkoutId;

    workoutList.addEventListener('click', event => {
      const workoutItem = event.target.closest('.workout');
      if (!workoutItem) return;

      const clickTime = new Date().getTime(); // Get the current time
      const timeDifference = clickTime - lastClickTime; // Calculate the time difference

      currentWorkoutId = workoutItem.dataset.id;

      if (timeDifference < doubleClickInterval) {
        // If the time difference is less than the double-click interval, consider it a double-click
        this._showContextMenu(event, currentWorkoutId); // Show the context menu
      }

      lastClickTime = clickTime; // Update the last click time
    });

    // Optional: Touch events for mobile devices
    workoutList.addEventListener('touchend', event => {
      const workoutItem = event.target.closest('.workout');
      if (!workoutItem) return;

      const touchTime = new Date().getTime();
      const timeDifference = touchTime - lastClickTime;

      currentWorkoutId = workoutItem.dataset.id;

      if (timeDifference < doubleClickInterval) {
        this._showContextMenu(event.touches[0], currentWorkoutId); // Handle touch-based double-tap
      }

      lastClickTime = touchTime;
    });
  }

  _showContextMenu(touch, workoutId) {
    // Create a new menu if it doesn't exist
    let contextMenu = document.querySelector('.context-menu');
    if (!contextMenu) {
      contextMenu = document.createElement('div');
      contextMenu.className = 'context-menu';
      document.body.appendChild(contextMenu);
    }

    // Position the menu near the touch point
    contextMenu.style.left = `${touch.pageX}px`;
    contextMenu.style.top = `${touch.pageY}px`;

    // Populate the menu with options
    contextMenu.innerHTML = `
      <button id="edit__btn">Edit</button>
      <button id="delete__btn">Delete</button>
    `;

    // Set event listeners for the buttons
    const deleteBtn = document.querySelector('#delete__btn');
    const editBtn = document.querySelector('#edit__btn');

    // Use a wrapper function to ensure the function is not called immediately
    deleteBtn.addEventListener('click', () => this.deleteWorkout(workoutId));
    editBtn.addEventListener('click', () => this.editWorkout(workoutId));

    contextMenu.style.display = 'block';

    // Hide the menu when clicking outside of it
    document.addEventListener(
      'touchstart',
      e => {
        if (!e.target.closest('.context-menu')) {
          contextMenu.style.display = 'none';
        }
      },
      { once: true }
    );
  }
}

const app = new App();
