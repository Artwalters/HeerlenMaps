
// Remove map wrapper class
$(".locations-map_wrapper").removeClass("is--show");

// Mapbox setup
mapboxgl.accessToken = "pk.eyJ1IjoicHJvamVjdGhlZXJsZW4iLCJhIjoiY2x4eWVmcXBvMWozZTJpc2FqbWgzcnAyeCJ9.SVOVbBG6o1lHs6TwCudR9g";

// State variables
let activePopup = null;
let isFlipped = false;
let threeboxLayerVisible = false;
let markersAdded = false;
const mapLocations = {
  type: "FeatureCollection",
  features: [],
};


// Initialize map
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/projectheerlen/clxyeqfbu000r01qpd37l0fhu",
  center: [5.979642, 50.887634],
  zoom: 15.5,
  pitch: 45,
  bearing: -17.6,
  antialias: true,
  interactive: true,
});


//////////! geo loactie code/////////////

class GeolocationManager {
  constructor(map) {
    this.map = map;
    this.isTrackingActive = false;
    this.isOrientationTracking = false;
    // Zoekradius properties
    this.searchRadiusId = 'search-radius';
    this.searchRadiusOuterId = 'search-radius-outer';
    this.radiusInMeters = 25;
    this.initialize();
  }

  initialize() {
    this.setupControls();
    this.addEventListeners();
    this.setupSearchRadius();
  }

  setupControls() {
    this.geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 6000,
      },
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: false,
      fitBoundsOptions: {
        maxZoom: 18,
        linear: false,
        duration: 1000,
      },
    });

    this.map.addControl(this.geolocateControl, 'bottom-right');
    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    this.setupOrientationButton();
  }

  setupOrientationButton() {
    const orientationContainer = document.createElement('div');
    orientationContainer.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

    this.orientationButton = document.createElement('button');
    this.orientationButton.className = 'mapboxgl-ctrl-icon orientation-tracking-button';
    this.orientationButton.title = 'Toggle Orientation Tracking';
    this.orientationButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path d="M12 2L8 11H16L12 2zM12 22L16 13H8L12 22z" fill="currentColor"/>
      </svg>
    `;
    orientationContainer.appendChild(this.orientationButton);

    this.map.addControl({
      onAdd: () => orientationContainer,
      onRemove: () => orientationContainer.remove()
    }, 'bottom-right');
  }

  setupSearchRadius() {
    const styles = `
      @keyframes pulse {
        0% {
          opacity: 0.6;
          transform: scale(1);
        }
        50% {
          opacity: 0.3;
        }
        100% {
          opacity: 0;
          transform: scale(1.5);
        }
      }
  
      .search-radius-outer {
        animation: pulse 2s ease-out infinite;
      }

      .orientation-tracking-button.active {
        background-color: #ffffff !important; /* Witte achtergrond behouden */
      }
      
      .orientation-tracking-button.active svg {
        fill: #00B4FF !important; /* Mapbox locatie marker kleur */
      }
    `;
  
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  
    this.map.on('load', () => {
      this.map.addSource(this.searchRadiusId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[]]
          }
        }
      });
  
      this.map.addLayer({
        id: this.searchRadiusId,
        type: 'fill-extrusion',
        source: this.searchRadiusId,
        paint: {
          'fill-extrusion-color': '#4B83F2',
          'fill-extrusion-opacity': 0.08,
          'fill-extrusion-height': 1,
          'fill-extrusion-base': 0
        }
      });
  
      this.map.addSource(this.searchRadiusOuterId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[]]
          }
        }
      });
  
      this.map.addLayer({
        id: this.searchRadiusOuterId,
        type: 'fill-extrusion',
        source: this.searchRadiusOuterId,
        paint: {
          'fill-extrusion-color': '#4B83F2',
          'fill-extrusion-opacity': 0.04,
          'fill-extrusion-height': 2,
          'fill-extrusion-base': 0
        }
      });
    });
  }

  addEventListeners() {
    // Luister naar geolocatie events
    this.geolocateControl.on('geolocate', (position) => this.handleUserLocation(position));
    this.geolocateControl.on('error', (error) => this.handleGeolocationError(error));
    
    // Oriëntatie button click handler
    this.orientationButton.addEventListener('click', () => this.toggleOrientationTracking());
    
    // Device oriëntatie handler
    window.addEventListener('deviceorientationabsolute', (event) => this.handleDeviceOrientation(event), true);
    window.addEventListener('deviceorientation', (event) => this.handleDeviceOrientation(event), true);
  }

  updateSearchRadius(coordinates) {
    if (!this.map.getSource(this.searchRadiusId)) return;

    const createCirclePolygon = (center, radiusInMeters, points = 64) => {
      const coords = {
        latitude: center[1],
        longitude: center[0]
      };
      const km = radiusInMeters / 1000;
      const ret = [];
      const distanceX = km/(111.320*Math.cos(coords.latitude*Math.PI/180));
      const distanceY = km/110.574;

      let theta, x, y;
      for(let i=0; i<points; i++) {
        theta = (i/points)*(2*Math.PI);
        x = distanceX*Math.cos(theta);
        y = distanceY*Math.sin(theta);
        ret.push([coords.longitude+x, coords.latitude+y]);
      }
      ret.push(ret[0]);
      return ret;
    };

    const circlePolygon = createCirclePolygon(coordinates, this.radiusInMeters);

    [this.searchRadiusId, this.searchRadiusOuterId].forEach(id => {
      this.map.getSource(id).setData({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [circlePolygon]
        }
      });
    });
  }

  handleUserLocation(position) {
    const userLocation = [position.coords.longitude, position.coords.latitude];
    
    if (this.isOrientationTracking) {
      // Als oriëntatie tracking aan staat, center op de gebruiker zonder de bearing aan te passen
      this.map.flyTo({
        center: userLocation,
        zoom: 19,
        duration: 1000,
      });
    } else {
      // Als oriëntatie tracking uit staat, reset bearing naar 0
      this.map.flyTo({
        center: userLocation,
        zoom: 19,
        bearing: 0,
        duration: 1000,
      });
    }
    
    this.updateSearchRadius(userLocation);
  }

  toggleOrientationTracking() {
    if (!this.isOrientationTracking) {
      this.enableOrientationTracking();
    } else {
      this.disableOrientationTracking();
    }
  }

  async enableOrientationTracking() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          this.activateOrientationTracking();
        } else {
          this.showNotification('Oriëntatie toegang geweigerd. Schakel het in bij je instellingen.');
        }
      } catch (error) {
        console.error('Orientation permission error:', error);
        this.showNotification('Schakel apparaat oriëntatie in bij instellingen.');
      }
    } else {
      this.activateOrientationTracking();
    }
  }

  activateOrientationTracking() {
    this.isOrientationTracking = true;
    this.orientationButton.classList.add('active');
    // Trigger geolocate om de kaart te centreren op de gebruiker
    this.geolocateControl.trigger();
  }

  disableOrientationTracking() {
    this.isOrientationTracking = false;
    this.orientationButton.classList.remove('active');
    // Reset kaart oriëntatie
    this.map.easeTo({ bearing: 0, duration: 300 });
  }

  handleDeviceOrientation(event) {
    if (!this.isOrientationTracking) return;

    let heading;
    // Voor iOS en Android dezelfde berekening gebruiken
    if (event.webkitCompassHeading !== undefined) {
      heading = event.webkitCompassHeading;
    } else if (event.alpha !== undefined) {
      heading = event.alpha;  // Gebruik direct alpha voor Android
    } else {
      return;
    }

    // Gebruik de heading direct voor beide platforms
    this.map.easeTo({
      bearing: heading,
      duration: 0
    });
  }

  handleGeolocationError(error) {
    console.error('Geolocation error:', error);
    const messages = {
      1: 'Locatie toegang geweigerd. Schakel het in bij je instellingen.',
      2: 'Locatie niet beschikbaar. Controleer je apparaat instellingen.',
      3: 'Verzoek verlopen. Probeer opnieuw.',
      default: 'Er is een fout opgetreden bij het ophalen van je locatie.'
    };
    this.showNotification(messages[error.code] || messages.default);
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'geolocation-error-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }
}

// Gebruik:
const geolocationManager = new GeolocationManager(map);


////////!3d models /////////////

// Initialize Threebox
const tb = new Threebox(map, map.getCanvas().getContext("webgl"), {
  defaultLights: true,
});



// Add 3D models
function addThreeboxLayer() {
  if (!threeboxLayerVisible) {
    map.addLayer({
      id: "custom-threebox-model",
      type: "custom",
      renderingMode: "3d",
      onAdd: () => {
        const models = [
          {
            url: "https://cdn.jsdelivr.net/gh/quentinwalters/HeerlenDoen_Glb-files@main/models/schuncklogo.glb",
            scale: { x: 1.3, y: 1.3, z: 1.3 },
            coords: [5.97899, 50.887957],
            rotation: { x: 0, y: 0, z: 295 }
          },
          {
            url: "https://cdn.jsdelivr.net/gh/quentinwalters/HeerlenDoen_Glb-files@main/models/theaterheerlen.glb",
            scale: { x: 0.6, y: 0.6, z: 0.6 },
            coords: [5.971979, 50.886074],
            rotation: { x: 0, y: 0, z: 27 }
          }
        ];

        models.forEach(model => {
          tb.loadObj({
            obj: model.url,
            type: "gltf",
            scale: model.scale,
            units: "meters",
            rotation: { x: 90, y: -90, z: 0 }
          }, (loadedModel) => {
            loadedModel.setCoords(model.coords);
            loadedModel.setRotation(model.rotation);
            tb.add(loadedModel);
          });
        });
      },
      render: () => tb.update(),
    });
    threeboxLayerVisible = true;
  }
}

// Remove 3D layer
function removeThreeboxLayer() {
  if (map.getLayer("custom-threebox-model")) {
    map.removeLayer("custom-threebox-model");
    threeboxLayerVisible = false;
  }
}

// Handle 3D models for different screen sizes
function loadThreeboxOnLargeDevices() {
  const isLargeDevice = window.matchMedia("(min-width: 479px)").matches;
  isLargeDevice && !threeboxLayerVisible ? addThreeboxLayer() : 
                   threeboxLayerVisible && removeThreeboxLayer();
}

// Event listeners for 3D models
window.addEventListener("load", loadThreeboxOnLargeDevices);
window.addEventListener("resize", loadThreeboxOnLargeDevices);

// Get CMS data
function getGeoData() {
  const locationListItems = document.getElementById("location-list").childNodes;
  locationListItems.forEach((location, index) => {
    const props = {
      name: location.querySelector("#name").value,
      locationID: location.querySelector("#locationID").value,
      locationInfo: location.querySelector(".locations-map_card").innerHTML,
      locationLat: parseFloat(location.querySelector("#locationLatitude").value),
      locationLong: parseFloat(location.querySelector("#locationLongitude").value),
      locationBearing: parseFloat(location.querySelector("#locationBearing").value),
      locationPitch: parseFloat(location.querySelector("#locationPitch").value),
      ondernemerkleur: location.querySelector("#ondernemerkleur").value,
      icon: location.querySelector("#icon").value,
      image: location.querySelector("#image").value
    };

    const geoData = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [props.locationLong, props.locationLat],
      },
      properties: {
        id: props.locationID,
        description: props.locationInfo,
        arrayID: index,
        color: props.ondernemerkleur,
        bearing: props.locationBearing,
        pitch: props.locationPitch,
        name: props.name,
        icon: props.icon,
        image: props.image
      },
    };

    if (!mapLocations.features.some((feature) => feature.properties.id === props.locationID)) {
      mapLocations.features.push(geoData);
    }
  });
}

// Load initial data
getGeoData();

// Load map icons
const loadIcons = () => {
  const uniqueIcons = [...new Set(mapLocations.features.map(feature => feature.properties.icon))];
  uniqueIcons.forEach(iconName => {
    map.loadImage(iconName, (error, image) => {
      if (error) throw error;
      map.addImage(iconName, image);
    });
  });
};

// Add markers to map
function addCustomMarkers() {
  if (markersAdded) return;
  
  map.addSource('locations', {
    type: 'geojson',
    data: mapLocations
  });
  
  const layers = [
    {
      id: 'location-markers',
      type: 'circle',
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 10,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 1
      }
    },
    {
      id: 'location-icons',
      type: 'symbol',
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-size': 0.15,
        'icon-allow-overlap': true,
        'icon-anchor': 'center'
      }
    },
    {
      id: 'location-labels',
      type: 'symbol',
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-offset': [0, 1],
        'text-anchor': 'top',
        'text-allow-overlap': false
      },
      paint: {
        'text-color': ['get', 'color'],
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-opacity': 1
      }
    }
  ];

  layers.forEach(layer => map.addLayer({ ...layer, source: 'locations' }));
  markersAdded = true;
}

// Popup functionality
const createPopupContent = (properties) => {
  const styles = `
    <style>
      .mapboxgl-popup-content {
        padding: 0 !important;
        border-radius: 20px !important;
        overflow: visible !important;
        width: 300px !important;
        background: transparent !important;
        box-shadow: none !important;
        transform-style: preserve-3d !important;
        perspective: 1000px;
      }
      
      .popup-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        transition: transform 0.6s;
        transform-style: preserve-3d;
      }
      
      .popup-wrapper.is-flipped {
        transform: rotateY(180deg);
      }
      
      .popup-side {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        background-color: ${properties.color || '#6B46C1'};
        color: white;
        border-radius: 20px;
      }
      
      .popup-front { transform: rotateY(0deg); }
      .popup-back { transform: rotateY(180deg); }

      .content-wrapper {
        padding: 30px;
        position: relative;
        display: flex;
        flex-direction: column;
      }

      .popup-title {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 18px;
        padding-right: 30px;
      }

      .popup-description {
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 60px;
        margin-top: 20px;
        flex-grow: 1;
        overflow: auto;
        max-height: 160px;
      }

      .popup-description::-webkit-scrollbar {
        width: 6px;
      }

      .popup-description::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.1);
      }

      .popup-description::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.3);
        border-radius: 3px;
      }

      .button-base {
        position: absolute;
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.4);
        color: white;
        padding: 10px 20px;
        border-radius: 15px;
        cursor: pointer;
        font-size: 14px;
        backdrop-filter: blur(5px);
        transition: all 0.3s ease;
        z-index: 10;
      }

      .button-base:hover {
        background: rgba(255,255,255,0.3);
        transform: scale(1.05);
      }

      .impressie-button {
        bottom: 30px;
        right: 30px;
      }

      .more-info-button {
        bottom: 30px;
        left: 30px;
      }

    .close-button {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255,255,255,0.2);
  border: 2px solid rgba(255,255,255,0.4);
  color: white;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 24px;
  padding: 0;  /* Verwijder eventuele padding */
  line-height: 0;  /* Zet line-height op 0 */
  transform-origin: center;  /* Zorgt voor betere rotatie */
  transition: all 0.3s ease;
  z-index: 20;
}

.close-button:hover {
  background: rgba(255,255,255,0.3);
  transform: rotate(90deg) scale(1.1);
}
      .info-row {
        margin-bottom: 14px;
        font-size: 14px;
        word-break: break-word;
      }

      .mapboxgl-popup-tip {
        display: none !important;
      }

      /* Mobile styles - alles proportioneel verkleind */
@media (max-width: 400px) {
  .mapboxgl-popup-content {
    width: 260px !important; /* Iets smaller */
  }
  
  .content-wrapper {
    padding: 24px; /* Verkleind van 30px */
    min-height: 200px; /* Aangepaste minimum hoogte */
  }
  
  .popup-title {
    font-size: 20px; /* Verkleind van 24px */
    margin-bottom: 14px; /* Verkleind van 18px */
    padding-right: 24px; /* Verkleind van 30px */
  }
  
  .popup-description {
    font-size: 13px;
    line-height: 1.4;
    margin-bottom: 48px; /* Verkleind van 60px zodat buttons niet over tekst komen */
    margin-top: 16px; /* Verkleind van 20px */
  }
  
  .button-base {
    padding: 8px 16px; /* Verkleind van 10px 20px */
    border-radius: 12px; /* Verkleind van 15px */
    font-size: 13px;
    bottom: 24px; /* Verkleind van 30px */
  }
  
  .impressie-button {
    right: 24px; /* Verkleind van 30px */
  }
  
  .more-info-button {
    left: 24px; /* Verkleind van 30px */
  }
  
  .close-button {
    width: 26px; /* Verkleind van 30px */
    height: 26px; /* Verkleind van 30px */
    top: 10px; /* Verkleind van 12px */
    right: 10px; /* Verkleind van 12px */
    font-size: 20px; /* Verkleind van 24px */
  }
  
  .info-row {
    font-size: 13px;
    margin-bottom: 12px; /* Verkleind van 14px */
  }
}
    </style>
  `;

  return {
    styles,
    html: `
      <div class="popup-wrapper">
        <div class="popup-side popup-front">
          <div class="content-wrapper">
            <button class="close-button">×</button>
            <div class="popup-title">${properties.name}</div>
            <div class="popup-description">${properties.description}</div>
            ${properties.image ? `<button class="impressie-button button-base">Impressie</button>` : ''}
            <button class="more-info-button button-base">Meer info</button>
          </div>
        </div>
        
        <div class="popup-side popup-back">
          <div class="content-wrapper">
            <button class="close-button">×</button>
            <div class="popup-title">Details</div>
            <div class="info-content">
              <div class="info-row">📍 ${properties.address || 'Voorbeeldstraat 123'}</div>
              <div class="info-row">🕒 ${properties.openingHours || 'Ma-Zo: 9:00 - 17:00'}</div>
              <div class="info-row">📞 ${properties.phone || '+31 6 12345678'}</div>
              <div class="info-row">✉️ ${properties.email || 'info@example.com'}</div>
            </div>
          </div>
          <button class="more-info-button button-base">Terug</button>
        </div>
      </div>
    `
  };
};

map.on('click', 'location-markers', (e) => {
  const coordinates = e.features[0].geometry.coordinates.slice();
  const properties = e.features[0].properties;
  isFlipped = false;

  //  // Toon de location wrapper
  // $(".locations-map_wrapper").addClass("is--show");
  
  // // Reset alle items
  // $(".locations-map_item").removeClass("is--show");
  
  // // Toon het juiste item met vertraging
  // const ID = properties.arrayID;
  // setTimeout(() => {
  //   $(".locations-map_item").eq(ID).addClass("is--show");
  // }, 1500);
  
  const handleExistingPopup = async () => {
    if (activePopup) {
      const element = activePopup.getElement();
      const content = element.querySelector('.mapboxgl-popup-content');
      
      content.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      content.style.transform = 'rotate(-5deg) translateY(20px) scale(0.8)';
      element.style.transition = 'opacity 0.3s ease-out';
      element.style.opacity = '0';
      
      await new Promise(resolve => setTimeout(resolve, 400));
      activePopup.remove();
      activePopup = null;
    }
  };

  const createAndShowPopup = async (coords = coordinates) => {  // Add coords parameter with default
    await handleExistingPopup();
    
    const popup = new mapboxgl.Popup({
      offset: {
        'bottom': [0, -30],
        'top': [0, 0],
        'left': [0, 0],
        'right': [0, 0]
      },
      className: 'custom-popup',
      closeButton: false,
      maxWidth: '300px',
      closeOnClick: false,
      anchor: 'bottom'
    });

    const { styles, html } = createPopupContent(properties);
    
    popup.setLngLat(coords)  // Gebruik de doorgegeven coords
      .setHTML(`${styles}${html}`)
      .addTo(map);
    
    activePopup = popup;
    
    const popupElement = popup.getElement();
    const popupContent = popupElement.querySelector('.mapboxgl-popup-content');
    const popupWrapper = popupElement.querySelector('.popup-wrapper');
    const frontContent = popupElement.querySelector('.popup-front .content-wrapper');
    const backContent = popupElement.querySelector('.popup-back .content-wrapper');
    
    // Update heights
    function updateHeight() {
      const maxHeight = Math.max(
        frontContent.offsetHeight,
        backContent.offsetHeight
      );
      popupWrapper.style.height = `${maxHeight}px`;
      popupElement.querySelectorAll('.popup-side').forEach(side => {
        side.style.height = `${maxHeight}px`;
      });
    }

    setTimeout(updateHeight, 10);
    
    // Start animation
    popupContent.style.opacity = '0';
    popupContent.style.transform = 'rotate(8deg) translateY(40px) scale(0.4)';
    
    requestAnimationFrame(() => {
      popupContent.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      popupContent.style.opacity = '1';
      popupContent.style.transform = 'rotate(0deg) translateY(0) scale(1)';
    });

    // Impressie functionality
    if (properties.image) {
      const impressieButton = popupElement.querySelector('.impressie-button');
      
      impressieButton.addEventListener('click', () => {
        // Animate out current popup
        popupContent.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        popupContent.style.transform = 'rotate(-5deg) translateY(40px) scale(0.6)';
        popupContent.style.opacity = '0';
        
        setTimeout(() => {
          // Get the height of the original popup
          const maxHeight = Math.max(
            frontContent.offsetHeight,
            backContent.offsetHeight
          );

          // Remove current popup
          popup.remove();
          activePopup = null;
        

          const imagePopup = new mapboxgl.Popup({
            offset: {
              'bottom': [0, -30],  // Zorg ervoor dat de popup precies boven de marker staat
              'top': [0, 0],
              'left': [0, 0],
              'right': [0, 0]
            },
            className: 'custom-popup',
            closeButton: false,
            maxWidth: '300px',
            closeOnClick: false,
            anchor: 'bottom'  // Anker de popup aan de onderkant
          });

          

          const imagePopupStyles = `
          <style>
            .mapboxgl-popup-content {
              padding: 0 !important;
              border-radius: 20px !important;
              overflow: hidden !important;
              width: 300px !important;
              background: ${properties.color || '#6B46C1'} !important;
              box-shadow: 0 8px 32px rgba(0,0,0,0.15) !important;
            }
        
            .image-popup-wrapper {
              position: relative;
              width: 100%;
              height: ${maxHeight}px;
            }
        
            .image-container {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
        
            .full-image {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
        
            .close-image-button {
              position: absolute;
              top: 12px;
              right: 12px;
              background: rgba(255,255,255,0.2);
              border: 2px solid rgba(255,255,255,0.4);
              color: white;
              border-radius: 50%;
              width: 30px;
              height: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              font-size: 24px;
              line-height: 0;
              padding: 0;
              transform-origin: center;
              transition: all 0.3s ease;
              z-index: 20;
            }
        
            .close-image-button:hover {
              background: rgba(255,255,255,0.3);
              transform: rotate(90deg) scale(1.1);
            }
        
            .location-name {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              padding: 20px;
              background: linear-gradient(transparent, rgba(0,0,0,0.7));
              color: white;
              font-size: 18px;
              font-weight: bold;
            }
        
            .back-button {
              position: absolute;
              bottom: 20px;
              right: 20px;
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.4);
              color: white;
              padding: 10px 20px;
              border-radius: 15px;
              cursor: pointer;
              font-size: 14px;
              backdrop-filter: blur(5px);
              transition: all 0.3s ease;
              z-index: 20;
            }
        
            .back-button:hover {
              background: rgba(255,255,255,0.3);
              transform: scale(1.05);
            }
        
            .mapboxgl-popup-tip {
              display: none !important;
            }
        
            /* Mobile styles */
            @media (max-width: 400px) {
              .mapboxgl-popup-content {
                width: 260px !important;
              }
        
              .image-popup-wrapper {
                height: ${maxHeight * 0.85}px; /* Proportioneel verkleind */
              }
        
              .close-image-button {
                width: 26px;
                height: 26px;
                top: 10px;
                right: 10px;
                font-size: 20px;
              }
        
              .location-name {
                padding: 16px;
                font-size: 16px;
              }
        
              .back-button {
                bottom: 16px;
                right: 16px;
                padding: 8px 16px;
                border-radius: 12px;
                font-size: 13px;
              }
            }
          </style>
          `;

          imagePopup.setLngLat(coordinates)
            .setHTML(`
              ${imagePopupStyles}
              <div class="image-popup-wrapper">
                <div class="image-container">
                  <img src="${properties.image}" alt="${properties.name}" class="full-image">
                  <button class="close-image-button">×</button>
                  <button class="back-button">Terug naar info</button>
                  <div class="location-name">${properties.name}</div>
                </div>
              </div>
            `)
            .addTo(map);

          activePopup = imagePopup;

          // Add close handler for new image popup
          const imagePopupElement = imagePopup.getElement();
          const imagePopupContent = imagePopupElement.querySelector('.mapboxgl-popup-content');
          const closeImageButton = imagePopupElement.querySelector('.close-image-button');
          const backButton = imagePopupElement.querySelector('.back-button');

          // Animate in
          imagePopupContent.style.opacity = '0';
          imagePopupContent.style.transform = 'rotate(8deg) translateY(40px) scale(0.4)';
          
          requestAnimationFrame(() => {
            imagePopupContent.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            imagePopupContent.style.opacity = '1';
            imagePopupContent.style.transform = 'rotate(0deg) translateY(0) scale(1)';
          });

          closeImageButton.addEventListener('click', () => {
            imagePopupContent.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            imagePopupContent.style.transform = 'rotate(-5deg) translateY(40px) scale(0.6)';
            imagePopupContent.style.opacity = '0';
            
            setTimeout(() => {
              imagePopup.remove();
              activePopup = null;
            }, 400);
          });

          // Add back button handler
          backButton.addEventListener('click', () => {
            // Animate out image popup
            imagePopupContent.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            imagePopupContent.style.transform = 'rotate(-5deg) translateY(40px) scale(0.6)';
            imagePopupContent.style.opacity = '0';
            
            setTimeout(() => {
              imagePopup.remove();
              activePopup = null;
              // Recreate original popup
              createAndShowPopup();
            }, 400);
          });
        }, 400);
      });
    }
    
    // Flip functionality
    const flipButtons = popupElement.querySelectorAll('.more-info-button');
    flipButtons.forEach(button => {
      button.addEventListener('click', () => {
        popupWrapper.classList.toggle('is-flipped');
      });
    });
    
    // Close handlers
    const closeButtons = popupElement.querySelectorAll('.close-button');
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        popupContent.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        popupContent.style.transform = 'rotate(-5deg) translateY(40px) scale(0.6)';
        popupContent.style.opacity = '0';
        
        setTimeout(() => {
          popup.remove();
          activePopup = null;
        }, 400);
      });
    });

    // Update height on window resize
    window.addEventListener('resize', updateHeight);
  };

  createAndShowPopup();

  // Voeg de mobiele check en flyTo toe
  const isMobile = window.matchMedia("(max-width: 479px)").matches;
  const flyToOffset = isMobile ? [0, 150] : [0, 250]; // Minder offset op mobiel

  map.flyTo({
    center: coordinates,
    offset: flyToOffset,
    duration: 1500,
    essential: true,
    easing: t => -(Math.cos(Math.PI * t) - 1) / 2
  });
});

// Cursor styling
map.on('mouseenter', 'location-markers', () => {
  map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'location-markers', () => {
  map.getCanvas().style.cursor = '';
});

// Initialize map
map.on('load', () => {
  loadIcons();
  addCustomMarkers();

  // Start animation
  setTimeout(() => {
    const isMobile = window.matchMedia("(max-width: 479px)").matches;
    const zoomLevel = isMobile ? 17 : 18;

    map.jumpTo({
      center: [5.979642, 50.887634],
      zoom: 15,
      pitch: 0,
      bearing: 0,
    });

    map.flyTo({
      center: [5.979642, 50.887634],
      zoom: zoomLevel,
      pitch: 55,
      bearing: -17.6,
      duration: 6000,
      essential: true,
      easing: function(t) {
        return t * (2 - t);
      },
    });
  }, 5000);
});

// Event Listeners
$(".close-block").click(() => {
  $(".locations-map_wrapper").removeClass("is--show");
});

function closePanelIfVisible() {
  if ($(".locations-map_wrapper").hasClass("is--show")) {
    $(".locations-map_wrapper").removeClass("is--show");
  }
}

// Map event handlers
['dragstart', 'zoomstart', 'rotatestart', 'pitchstart'].forEach(event => {
  map.on(event, () => {
    closePanelIfVisible();
    
    // Only animate and close popup on drag
    if (event === 'dragstart' && activePopup) {
      const popupContent = activePopup.getElement().querySelector('.mapboxgl-popup-content');
      popupContent.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      popupContent.style.transform = 'rotate(-5deg) translateY(40px) scale(0.6)';
      popupContent.style.opacity = '0';
      
      setTimeout(() => {
        activePopup.remove();
        activePopup = null;
      }, 400);
    }
  });
});
