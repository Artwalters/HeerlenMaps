$(".locations-map_wrapper").removeClass("is--show"),
  (mapboxgl.accessToken =
    "pk.eyJ1IjoicHJvamVjdGhlZXJsZW4iLCJhIjoiY2x4eWVmcXBvMWozZTJpc2FqbWgzcnAyeCJ9.SVOVbBG6o1lHs6TwCudR9g");
let activePopup = null,
//   isFlipped = !1,
  markersAdded = !1,
  modelsAdded = !1,
  mapLocations = { type: "FeatureCollection", features: [] },
  map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/projectheerlen/clxyeqfbu000r01qpd37l0fhu",
    center: [5.979642, 50.887634],
    zoom: 15.5,
    pitch: 45,
    bearing: -17.6,
    antialias: !0,
    interactive: !0,
  }); 

  //! geo locatie /////
class GeolocationManager {
  constructor(_) {
    (this.map = _),
      (this.searchRadiusId = "search-radius"),
      (this.searchRadiusOuterId = "search-radius-outer"),
      (this.radiusInMeters = 25),
      (this.boundaryLayerIds = [
        "boundary-fill",
        "boundary-line",
        "boundary-label",
      ]),
      (this.distanceMarkers = []),
      (this.isPopupOpen = !1),
      (this.centerPoint = [5.977105864037915, 50.88774161029858]),
      (this.boundaryRadius = 2.2),
      this.initialize();
  }
  initialize() {
    this.setupGeolocateControl(),
      this.setupSearchRadius(),
      this.setupBoundaryCheck();
  }
  updateDistanceMarkers(_) {
    this.distanceMarkers && this.distanceMarkers.forEach((_) => _.remove()),
      (this.distanceMarkers = []),
      mapLocations.features.forEach((c) => {
        let a = c.geometry.coordinates,
          e = 1e3 * this.calculateDistance(_[1], _[0], a[1], a[0]);
        if (e <= this.radiusInMeters) {
          let t = document.createElement("div");
          (t.className = "distance-marker"),
            (t.innerHTML = `
  <span class="distance-marker-distance">${Math.round(e)}m</span>
`);
          let l = new mapboxgl.Marker({ element: t })
            .setLngLat(a)
            .addTo(this.map);
          t.addEventListener("click", () => {
            this.map.fire("click", {
              lngLat: a,
              point: this.map.project(a),
              features: [c],
            });
          }),
            this.distanceMarkers.push(l);
        }
      });
  }
  handleUserLocation(_) {
    let c = [_.coords.longitude, _.coords.latitude];
    if (this.isWithinBoundary(c)) {
      if (
        (this.updateSearchRadius(c),
        this.updateDistanceMarkers(c),
        !this.isPopupOpen)
      ) {
        if (this.isFirstLocation)
          this.map.flyTo({
            center: c,
            zoom: 17.5,
            pitch: 45,
            duration: 2e3,
            bearing: _.coords.heading || 0,
          }),
            (this.isFirstLocation = !1);
        else {
          let a = this.map.getCenter();
          this.calculateDistance(a.lat, a.lng, c[1], c[0]) > 0.05 &&
            this.map.easeTo({ center: c, duration: 1e3 });
        }
      }
    } else this.geolocateControl.trigger(), this.showBoundaryPopup();
  }
  setupGeolocateControl() {
    document
      .querySelectorAll(".mapboxgl-ctrl-top-right .mapboxgl-ctrl-group")
      .forEach((_) => _.remove());
    document
      .querySelectorAll(".mapboxgl-ctrl-bottom-right .mapboxgl-ctrl-group")
      .forEach((_) => _.remove()),
      (this.geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: !0,
          maximumAge: 1e3,
          timeout: 6e3,
        },
        trackUserLocation: !0,
        showUserHeading: !0,
        showAccuracyCircle: !1,
        fitBoundsOptions: { maxZoom: 17.5, animate: !0 },
      })),
      (this.isFirstLocation = !0),
      (this.isTracking = !1),
      this.geolocateControl.on("geolocate", (_) => {
        this.handleUserLocation(_);
      }),
      this.geolocateControl.on("trackuserlocationupdate", (_) => {
        if (!this.isPopupOpen && this.isTracking) {
          let c = _.coords.heading || 0;
          this.map.easeTo({ bearing: c, duration: 0 });
        }
      }),
      this.geolocateControl.on("error", (_) => this.handleGeolocationError(_)),
      this.map.once("idle", () => {
        let _ = document.querySelector(".mapboxgl-ctrl-geolocate");
        _ &&
          (_.parentElement &&
            ((_.parentElement.style.bottom = "clamp(20px, 10vh, 40px)"),
            (_.parentElement.style.right = "10px")),
          _.addEventListener("click", () => {
            this.showBoundaryLayers();
          }));
      }),
      this.geolocateControl.on("trackuserlocationstart", () => {
        console.log("Location tracking started"),
          (this.isTracking = !0),
          this.showBoundaryLayers();
      }),
      this.geolocateControl.on("trackuserlocationend", () => {
        console.log("Location tracking ended"),
          (this.isTracking = !1),
          (this.isFirstLocation = !0),
          this.map.easeTo({ bearing: 0, pitch: 45 }),
          this.clearSearchRadius(),
          this.distanceMarkers &&
            (this.distanceMarkers.forEach((_) => _.remove()),
            (this.distanceMarkers = []));
      }),
      this.map.addControl(this.geolocateControl, "bottom-right"),
      this.map.addControl(new mapboxgl.NavigationControl(), "top-right");
  }
  setupSearchRadius() {
    this.map.on("load", () => {
      this.map.addSource(this.searchRadiusId, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [[]] },
        },
      }),
        this.map.addLayer({
          id: this.searchRadiusId,
          type: "fill-extrusion",
          source: this.searchRadiusId,
          paint: {
            "fill-extrusion-color": "#4B83F2",
            "fill-extrusion-opacity": 0.08,
            "fill-extrusion-height": 1,
            "fill-extrusion-base": 0,
          },
        }),
        this.map.addSource(this.searchRadiusOuterId, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [[]] },
          },
        }),
        this.map.addLayer({
          id: this.searchRadiusOuterId,
          type: "fill-extrusion",
          source: this.searchRadiusOuterId,
          paint: {
            "fill-extrusion-color": "#4B83F2",
            "fill-extrusion-opacity": 0.04,
            "fill-extrusion-height": 2,
            "fill-extrusion-base": 0,
          },
        });
    });
  }
  setupBoundaryCheck() {
    this.map.on("load", () => {
      this.map.addSource("boundary-circle", {
        type: "geojson",
        data: this.createBoundaryCircle(),
      }),
        this.map.addLayer({
          id: "boundary-fill",
          type: "fill",
          source: "boundary-circle",
          paint: { "fill-color": "#4B83F2", "fill-opacity": 0.03 },
          layout: { visibility: "none" },
        }),
        this.map.addLayer({
          id: "boundary-line",
          type: "line",
          source: "boundary-circle",
          paint: {
            "line-color": "#4B83F2",
            "line-width": 2,
            "line-dasharray": [3, 3],
          },
          layout: { visibility: "none" },
        });
    });
  }
  showBoundaryLayers() {
    this.boundaryLayerIds.forEach((_) => {
      if (
        this.map.getLayer(_) &&
        (this.map.setLayoutProperty(_, "visibility", "visible"),
        "boundary-fill" === _)
      ) {
        let c = 0,
          a = () => {
            c < 0.03 &&
              ((c += 0.005),
              this.map.setPaintProperty(_, "fill-opacity", c),
              requestAnimationFrame(a));
          };
        a();
      }
    });
  }
  hideBoundaryLayers() {
    this.boundaryLayerIds.forEach((_) => {
      if (this.map.getLayer(_)) {
        if ("boundary-fill" === _) {
          let c = 0.03,
            a = () => {
              c > 0
                ? ((c -= 0.005),
                  this.map.setPaintProperty(_, "fill-opacity", c),
                  requestAnimationFrame(a))
                : this.map.setLayoutProperty(_, "visibility", "none");
            };
          a();
        } else this.map.setLayoutProperty(_, "visibility", "none");
      }
    });
  }
  updateSearchRadius(_) {
    if (!this.map.getSource(this.searchRadiusId)) return;
    let c = ((_, c, a = 64) => {
      let e = { latitude: _[1], longitude: _[0] },
        t = c / 1e3,
        l = [],
        p = t / (111.32 * Math.cos((e.latitude * Math.PI) / 180)),
        o = t / 110.574,
        i,
        r,
        s;
      for (let x = 0; x < a; x++)
        (r = p * Math.cos((i = (x / a) * (2 * Math.PI)))),
          (s = o * Math.sin(i)),
          l.push([e.longitude + r, e.latitude + s]);
      return l.push(l[0]), l;
    })(_, this.radiusInMeters);
    [this.searchRadiusId, this.searchRadiusOuterId].forEach((_) => {
      this.map
        .getSource(_)
        .setData({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [c] },
        });
    });
  }
  clearSearchRadius() {
    this.map.getSource(this.searchRadiusId) &&
      [this.searchRadiusId, this.searchRadiusOuterId].forEach((_) => {
        this.map
          .getSource(_)
          .setData({
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [[]] },
          });
      });
  }
  handleGeolocationError(_) {
    console.error("Geolocation error:", _);
    let c = {
      1: "Locatie toegang geweigerd. Schakel het in bij je instellingen.",
      2: "Locatie niet beschikbaar. Controleer je apparaat instellingen.",
      3: "Verzoek verlopen. Probeer opnieuw.",
      default: "Er is een fout opgetreden bij het ophalen van je locatie.",
    };
    this.showNotification(c[_.code] || c.default);
  }
  showNotification(_) {
    let c = document.createElement("div");
    (c.className = "geolocation-error-notification"),
      (c.textContent = _),
      document.body.appendChild(c),
      setTimeout(() => c.remove(), 5e3);
  }
  createBoundaryCircle() {
    let _ = { latitude: this.centerPoint[1], longitude: this.centerPoint[0] },
      c = this.boundaryRadius,
      a = [],
      e = c / (111.32 * Math.cos((_.latitude * Math.PI) / 180)),
      t = c / 110.574;
    for (let l = 0; l <= 64; l++) {
      let p = (l / 64) * (2 * Math.PI),
        o = e * Math.cos(p),
        i = t * Math.sin(p);
      a.push([_.longitude + o, _.latitude + i]);
    }
    return {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [a] },
    };
  }
  isWithinBoundary(_) {
    return (
      this.calculateDistance(
        _[1],
        _[0],
        this.centerPoint[1],
        this.centerPoint[0]
      ) <= this.boundaryRadius
    );
  }
  calculateDistance(_, c, a, e) {
    let t = this.deg2rad(a - _),
      l = this.deg2rad(e - c),
      p =
        Math.sin(t / 2) * Math.sin(t / 2) +
        Math.cos(this.deg2rad(_)) *
          Math.cos(this.deg2rad(a)) *
          Math.sin(l / 2) *
          Math.sin(l / 2);
    return 6371 * (2 * Math.atan2(Math.sqrt(p), Math.sqrt(1 - p)));
  }
  deg2rad(_) {
    return _ * (Math.PI / 180);
  }
  showBoundaryPopup() {
    let _ = document.querySelector(".location-boundary-popup");
    _ && _.remove();
    let c = document.createElement("div");
    c.className = "location-boundary-popup";
    let a = document.createElement("h3");
    a.textContent = "Kom naar Heerlen";
    let e = document.createElement("p");
    e.textContent =
      "Deze functie is alleen beschikbaar binnen de blauwe cirkel op de kaart. Kom naar het centrum van Heerlen om de interactieve kaart te gebruiken!";
    let t = document.createElement("button");
    t.textContent = "Ik kom er aan!";
    let l = this;
    t.addEventListener("click", function () {
      window.innerWidth <= 768
        ? (c.style.transform = "translateY(100%)")
        : (c.style.transform = "translateX(120%)"),
        setTimeout(() => {
          c.remove();
        }, 600),
        setTimeout(() => {
          l.hideBoundaryLayers();
        }, 200);
    }),
      c.appendChild(a),
      c.appendChild(e),
      c.appendChild(t),
      document.body.appendChild(c),
      this.map.getLayer("boundary-fill") &&
        (this.map.setPaintProperty("boundary-fill", "fill-opacity", 0.05),
        this.map.setPaintProperty("boundary-line", "line-width", 3),
        setTimeout(() => {
          this.map.setPaintProperty("boundary-fill", "fill-opacity", 0.03),
            this.map.setPaintProperty("boundary-line", "line-width", 2);
        }, 2e3)),
      this.map.flyTo({
        center: this.centerPoint,
        zoom: 14,
        pitch: 0,
        bearing: 0,
        duration: 1500,
      }),
      setTimeout(() => c.classList.add("show"), 10);
  }
}
let geolocationManager = new GeolocationManager(map);
window.geolocationManager = geolocationManager; 



//! cms data & markers ////
function getGeoData() {
  document.getElementById("location-list").childNodes.forEach((_, c) => {
    let a = {
        name: _.querySelector("#name").value,
        locationID: _.querySelector("#locationID").value,
        locationInfo: _.querySelector(".locations-map_card").innerHTML,
        locationLat: parseFloat(_.querySelector("#locationLatitude").value),
        locationLong: parseFloat(_.querySelector("#locationLongitude").value),
        ondernemerkleur: _.querySelector("#ondernemerkleur").value,
        icon: _.querySelector("#icon").value,
        image: _.querySelector("#image").value,
        category: _.querySelector("#category").value,
        // New fields
        telefoonummer: _.querySelector("#telefoonnummer").value,
        locatie: _.querySelector("#locatie").value,
        maps: _.querySelector("#maps").value,
        website: _.querySelector("#website").value,
        // Opening hours
        maandag: _.querySelector("#maandag").value,
        dinsdag: _.querySelector("#dinsdag").value,
        woensdag: _.querySelector("#woensdag").value,
        donderdag: _.querySelector("#donderdag").value,
        vrijdag: _.querySelector("#vrijdag").value,
        zaterdag: _.querySelector("#zaterdag").value,
        zondag: _.querySelector("#zondag").value
      },
      e = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [a.locationLong, a.locationLat],
        },
        properties: {
          id: a.locationID,
          description: a.locationInfo,
          arrayID: c,
          color: a.ondernemerkleur,
          name: a.name,
          icon: a.icon,
          image: a.image,
          category: a.category,
          // New properties
          telefoonummer: a.telefoonummer,
          locatie: a.locatie,
          maps: a.maps,
          website: a.website,
          // Opening hours as direct properties
          maandag: a.maandag,
          dinsdag: a.dinsdag,
          woensdag: a.woensdag,
          donderdag: a.donderdag,
          vrijdag: a.vrijdag,
          zaterdag: a.zaterdag,
          zondag: a.zondag
        },
      };
    mapLocations.features.some((_) => _.properties.id === a.locationID) ||
      mapLocations.features.push(e);
  });
}


//! cms data voor AR markers ////
function getARData() {
  document.getElementById("location-ar-list").childNodes.forEach((_, c) => {
    let a = {
        name_ar: _.querySelector("#name_ar").value,
        slug_ar: _.querySelector("#slug_ar").value,
        latitude_ar: parseFloat(_.querySelector("#latitude_ar").value),
        longitude_ar: parseFloat(_.querySelector("#longitude_ar").value),
        image_ar: _.querySelector("#image_ar").value,
        description_ar: _.querySelector("#description_ar").value,
        link_ar: _.querySelector("#link_ar").value,
      },
      e = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [a.longitude_ar, a.latitude_ar],
        },
        properties: {
          type: "ar",
          name: a.name_ar,
          slug: a.slug_ar,
          description: a.description_ar,
          arrayID: c,
          image: a.image_ar,
          color: "#4B83F2",
          link_ar: a.link_ar,
        },
      };
    mapLocations.features.push(e);
  });
}
  getGeoData(),
  getARData(); 
  
  
  //! Load map ondernemer icons //
let loadIcons = () => {
  [...new Set(mapLocations.features.map((_) => _.properties.icon))].forEach(
    (_) => {
      map.loadImage(_, (c, a) => {
        if (c) throw c;
        map.addImage(_, a);
      });
    }
  );
};
function addCustomMarkers() {
  if (markersAdded) return;
  map.addSource("locations", { type: "geojson", data: mapLocations }),
    [
      {
        id: "location-markers",
        type: "circle",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            2,
            14,
            5,
            16,
            8,
            18,
            10,
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0,
        },
      },
      {
        id: "location-icons",
        type: "symbol",
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            0.05,
            14,
            0.08,
            16,
            0.12,
            18,
            0.15,
          ],
          "icon-allow-overlap": !0,
          "icon-anchor": "center",
        },
        paint: { "icon-opacity": 0 },
      },
      {
        id: "location-labels",
        type: "symbol",
        layout: {
          "text-field": ["get", "name"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            8,
            14,
            10,
            16,
            11,
            18,
            12,
          ],
          "text-offset": [0, 1],
          "text-anchor": "top",
          "text-allow-overlap": !1,
        },
        paint: {
          "text-color": ["get", "color"],
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
          "text-opacity": 0,
        },
      },
    ].forEach((_) => map.addLayer({ ..._, source: "locations" }));
  let _ = 0,
    c = () => {
      (_ += 0.1),
        map.setPaintProperty("location-markers", "circle-opacity", _),
        map.setPaintProperty("location-icons", "icon-opacity", _),
        map.setPaintProperty("location-labels", "text-opacity", _),
        _ < 1 && requestAnimationFrame(c);
    };
  setTimeout(c, 100), (markersAdded = !0);
}
map.on("mouseenter", "location-markers", () => {
  map.getCanvas().style.cursor = "pointer";
}),
  map.on("mouseleave", "location-markers", () => {
    map.getCanvas().style.cursor = "";
  }); 
  
  
  //! filter voor markers /////
let activeFilters = new Set();
function setupLocationFilters() {
  document.querySelectorAll(".filter-btn").forEach((_) => {
    _.addEventListener("click", () => {
      let c = _.dataset.category;
      _.classList.toggle("is--active"),
        activeFilters.has(c) ? activeFilters.delete(c) : activeFilters.add(c),
        applyMapFilters();
    });
  });
}
function applyMapFilters() {
  if (0 === activeFilters.size) {
    map.setFilter("location-markers", null),
      map.setFilter("location-icons", null),
      map.setFilter("location-labels", null);
    return;
  }
  let _ = ["in", ["get", "category"], ["literal", Array.from(activeFilters)]];
  map.setFilter("location-markers", _),
    map.setFilter("location-icons", _),
    map.setFilter("location-labels", _);
} 


//! popup logica
let createPopupContent = (_) => {
  let c = "ar" === _.type,
    a = `
      <style>
         .popup-side {
          background-color: ${_.color || "#6B46C1"};
          clip-path: polygon(calc(100% - 0px) 26.5px, calc(100% - 0px) calc(100% - 26.5px), calc(100% - 0px) calc(100% - 26.5px), calc(100% - 0.34671999999995px) calc(100% - 22.20048px), calc(100% - 1.3505599999999px) calc(100% - 18.12224px), calc(100% - 2.95704px) calc(100% - 14.31976px), calc(100% - 5.11168px) calc(100% - 10.84752px), calc(100% - 7.76px) calc(100% - 7.76px), calc(100% - 10.84752px) calc(100% - 5.11168px), calc(100% - 14.31976px) calc(100% - 2.9570399999999px), calc(100% - 18.12224px) calc(100% - 1.35056px), calc(100% - 22.20048px) calc(100% - 0.34672px), calc(100% - 26.5px) calc(100% - 0px), calc(50% - -32.6px) calc(100% - 0px), calc(50% - -32.6px) calc(100% - 0px), calc(50% - -31.57121px) calc(100% - 0.057139999999947px), calc(50% - -30.56648px) calc(100% - 0.2255199999999px), calc(50% - -29.59427px) calc(100% - 0.50057999999996px), calc(50% - -28.66304px) calc(100% - 0.87775999999991px), calc(50% - -27.78125px) calc(100% - 1.3525px), calc(50% - -26.95736px) calc(100% - 1.92024px), calc(50% - -26.19983px) calc(100% - 2.57642px), calc(50% - -25.51712px) calc(100% - 3.31648px), calc(50% - -24.91769px) calc(100% - 4.13586px), calc(50% - -24.41px) calc(100% - 5.03px), calc(50% - -24.41px) calc(100% - 5.03px), calc(50% - -22.95654px) calc(100% - 7.6045699999999px), calc(50% - -21.23752px) calc(100% - 9.9929599999998px), calc(50% - -19.27298px) calc(100% - 12.17519px), calc(50% - -17.08296px) calc(100% - 14.13128px), calc(50% - -14.6875px) calc(100% - 15.84125px), calc(50% - -12.10664px) calc(100% - 17.28512px), calc(50% - -9.36042px) calc(100% - 18.44291px), calc(50% - -6.46888px) calc(100% - 19.29464px), calc(50% - -3.45206px) calc(100% - 19.82033px), calc(50% - -0.32999999999998px) calc(100% - 20px), calc(50% - -0.32999999999998px) calc(100% - 20px), calc(50% - 2.79179px) calc(100% - 19.82033px), calc(50% - 5.8079199999999px) calc(100% - 19.29464px), calc(50% - 8.69853px) calc(100% - 18.44291px), calc(50% - 11.44376px) calc(100% - 17.28512px), calc(50% - 14.02375px) calc(100% - 15.84125px), calc(50% - 16.41864px) calc(100% - 14.13128px), calc(50% - 18.60857px) calc(100% - 12.17519px), calc(50% - 20.57368px) calc(100% - 9.9929599999999px), calc(50% - 22.29411px) calc(100% - 7.60457px), calc(50% - 23.75px) calc(100% - 5.03px), calc(50% - 23.75px) calc(100% - 5.03px), calc(50% - 24.25769px) calc(100% - 4.1358599999999px), calc(50% - 24.85712px) calc(100% - 3.3164799999998px), calc(50% - 25.53983px) calc(100% - 2.57642px), calc(50% - 26.29736px) calc(100% - 1.92024px), calc(50% - 27.12125px) calc(100% - 1.3525px), calc(50% - 28.00304px) calc(100% - 0.87775999999997px), calc(50% - 28.93427px) calc(100% - 0.50057999999996px), calc(50% - 29.90648px) calc(100% - 0.22552000000002px), calc(50% - 30.91121px) calc(100% - 0.057140000000004px), calc(50% - 31.94px) calc(100% - 0px), 26.5px calc(100% - 0px), 26.5px calc(100% - 0px), 22.20048px calc(100% - 0.34671999999989px), 18.12224px calc(100% - 1.3505599999999px), 14.31976px calc(100% - 2.95704px), 10.84752px calc(100% - 5.1116799999999px), 7.76px calc(100% - 7.76px), 5.11168px calc(100% - 10.84752px), 2.95704px calc(100% - 14.31976px), 1.35056px calc(100% - 18.12224px), 0.34672px calc(100% - 22.20048px), 4.3855735949631E-31px calc(100% - 26.5px), 0px 26.5px, 0px 26.5px, 0.34672px 22.20048px, 1.35056px 18.12224px, 2.95704px 14.31976px, 5.11168px 10.84752px, 7.76px 7.76px, 10.84752px 5.11168px, 14.31976px 2.95704px, 18.12224px 1.35056px, 22.20048px 0.34672px, 26.5px 4.3855735949631E-31px, calc(50% - 26.74px) 0px, calc(50% - 26.74px) 0px, calc(50% - 25.31263px) 0.07137px, calc(50% - 23.91544px) 0.28176px, calc(50% - 22.55581px) 0.62559px, calc(50% - 21.24112px) 1.09728px, calc(50% - 19.97875px) 1.69125px, calc(50% - 18.77608px) 2.40192px, calc(50% - 17.64049px) 3.22371px, calc(50% - 16.57936px) 4.15104px, calc(50% - 15.60007px) 5.17833px, calc(50% - 14.71px) 6.3px, calc(50% - 14.71px) 6.3px, calc(50% - 13.6371px) 7.64798px, calc(50% - 12.446px) 8.89024px, calc(50% - 11.1451px) 10.01826px, calc(50% - 9.7428px) 11.02352px, calc(50% - 8.2475px) 11.8975px, calc(50% - 6.6676px) 12.63168px, calc(50% - 5.0115px) 13.21754px, calc(50% - 3.2876px) 13.64656px, calc(50% - 1.5043px) 13.91022px, calc(50% - -0.32999999999996px) 14px, calc(50% - -0.32999999999998px) 14px, calc(50% - -2.16431px) 13.9105px, calc(50% - -3.94768px) 13.6476px, calc(50% - -5.67177px) 13.2197px, calc(50% - -7.32824px) 12.6352px, calc(50% - -8.90875px) 11.9025px, calc(50% - -10.40496px) 11.03px, calc(50% - -11.80853px) 10.0261px, calc(50% - -13.11112px) 8.8992px, calc(50% - -14.30439px) 7.6577px, calc(50% - -15.38px) 6.31px, calc(50% - -15.38px) 6.31px, calc(50% - -16.27279px) 5.18562px, calc(50% - -17.25432px) 4.15616px, calc(50% - -18.31733px) 3.22714px, calc(50% - -19.45456px) 2.40408px, calc(50% - -20.65875px) 1.6925px, calc(50% - -21.92264px) 1.09792px, calc(50% - -23.23897px) 0.62586px, calc(50% - -24.60048px) 0.28184px, calc(50% - -25.99991px) 0.07138px, calc(50% - -27.43px) 8.9116630386686E-32px, calc(100% - 26.5px) 0px, calc(100% - 26.5px) 0px, calc(100% - 22.20048px) 0.34672px, calc(100% - 18.12224px) 1.35056px, calc(100% - 14.31976px) 2.95704px, calc(100% - 10.84752px) 5.11168px, calc(100% - 7.76px) 7.76px, calc(100% - 5.11168px) 10.84752px, calc(100% - 2.9570399999999px) 14.31976px, calc(100% - 1.35056px) 18.12224px, calc(100% - 0.34671999999995px) 22.20048px, calc(100% - 5.6843418860808E-14px) 26.5px); 
        }
  
      .close-button {
        background: ${_.color || "#6B46C1"};
      }

        ${
          c
            ? `
          .ar-button {
            background: #FF6B6B;
            border: 2px solid white;
            font-weight: bold;
          }
          .ar-description {
            font-size: 0.9em;
            margin-top: 10px;
          }

          .popup-side {
          background-color: black || '#6B46C1'};
          clip-path: polygon(calc(100% - 0px) 26.5px, calc(100% - 0px) calc(100% - 26.5px), calc(100% - 0px) calc(100% - 26.5px), calc(100% - 0.34671999999995px) calc(100% - 22.20048px), calc(100% - 1.3505599999999px) calc(100% - 18.12224px), calc(100% - 2.95704px) calc(100% - 14.31976px), calc(100% - 5.11168px) calc(100% - 10.84752px), calc(100% - 7.76px) calc(100% - 7.76px), calc(100% - 10.84752px) calc(100% - 5.11168px), calc(100% - 14.31976px) calc(100% - 2.9570399999999px), calc(100% - 18.12224px) calc(100% - 1.35056px), calc(100% - 22.20048px) calc(100% - 0.34672px), calc(100% - 26.5px) calc(100% - 0px), calc(50% - -32.6px) calc(100% - 0px), calc(50% - -32.6px) calc(100% - 0px), calc(50% - -31.57121px) calc(100% - 0.057139999999947px), calc(50% - -30.56648px) calc(100% - 0.2255199999999px), calc(50% - -29.59427px) calc(100% - 0.50057999999996px), calc(50% - -28.66304px) calc(100% - 0.87775999999991px), calc(50% - -27.78125px) calc(100% - 1.3525px), calc(50% - -26.95736px) calc(100% - 1.92024px), calc(50% - -26.19983px) calc(100% - 2.57642px), calc(50% - -25.51712px) calc(100% - 3.31648px), calc(50% - -24.91769px) calc(100% - 4.13586px), calc(50% - -24.41px) calc(100% - 5.03px), calc(50% - -24.41px) calc(100% - 5.03px), calc(50% - -22.95654px) calc(100% - 7.6045699999999px), calc(50% - -21.23752px) calc(100% - 9.9929599999998px), calc(50% - -19.27298px) calc(100% - 12.17519px), calc(50% - -17.08296px) calc(100% - 14.13128px), calc(50% - -14.6875px) calc(100% - 15.84125px), calc(50% - -12.10664px) calc(100% - 17.28512px), calc(50% - -9.36042px) calc(100% - 18.44291px), calc(50% - -6.46888px) calc(100% - 19.29464px), calc(50% - -3.45206px) calc(100% - 19.82033px), calc(50% - -0.32999999999998px) calc(100% - 20px), calc(50% - -0.32999999999998px) calc(100% - 20px), calc(50% - 2.79179px) calc(100% - 19.82033px), calc(50% - 5.8079199999999px) calc(100% - 19.29464px), calc(50% - 8.69853px) calc(100% - 18.44291px), calc(50% - 11.44376px) calc(100% - 17.28512px), calc(50% - 14.02375px) calc(100% - 15.84125px), calc(50% - 16.41864px) calc(100% - 14.13128px), calc(50% - 18.60857px) calc(100% - 12.17519px), calc(50% - 20.57368px) calc(100% - 9.9929599999999px), calc(50% - 22.29411px) calc(100% - 7.60457px), calc(50% - 23.75px) calc(100% - 5.03px), calc(50% - 23.75px) calc(100% - 5.03px), calc(50% - 24.25769px) calc(100% - 4.1358599999999px), calc(50% - 24.85712px) calc(100% - 3.3164799999998px), calc(50% - 25.53983px) calc(100% - 2.57642px), calc(50% - 26.29736px) calc(100% - 1.92024px), calc(50% - 27.12125px) calc(100% - 1.3525px), calc(50% - 28.00304px) calc(100% - 0.87775999999997px), calc(50% - 28.93427px) calc(100% - 0.50057999999996px), calc(50% - 29.90648px) calc(100% - 0.22552000000002px), calc(50% - 30.91121px) calc(100% - 0.057140000000004px), calc(50% - 31.94px) calc(100% - 0px), 26.5px calc(100% - 0px), 26.5px calc(100% - 0px), 22.20048px calc(100% - 0.34671999999989px), 18.12224px calc(100% - 1.3505599999999px), 14.31976px calc(100% - 2.95704px), 10.84752px calc(100% - 5.1116799999999px), 7.76px calc(100% - 7.76px), 5.11168px calc(100% - 10.84752px), 2.95704px calc(100% - 14.31976px), 1.35056px calc(100% - 18.12224px), 0.34672px calc(100% - 22.20048px), 4.3855735949631E-31px calc(100% - 26.5px), 0px 26.5px, 0px 26.5px, 0.34672px 22.20048px, 1.35056px 18.12224px, 2.95704px 14.31976px, 5.11168px 10.84752px, 7.76px 7.76px, 10.84752px 5.11168px, 14.31976px 2.95704px, 18.12224px 1.35056px, 22.20048px 0.34672px, 26.5px 4.3855735949631E-31px, calc(50% - 26.74px) 0px, calc(50% - 26.74px) 0px, calc(50% - 25.31263px) 0.07137px, calc(50% - 23.91544px) 0.28176px, calc(50% - 22.55581px) 0.62559px, calc(50% - 21.24112px) 1.09728px, calc(50% - 19.97875px) 1.69125px, calc(50% - 18.77608px) 2.40192px, calc(50% - 17.64049px) 3.22371px, calc(50% - 16.57936px) 4.15104px, calc(50% - 15.60007px) 5.17833px, calc(50% - 14.71px) 6.3px, calc(50% - 14.71px) 6.3px, calc(50% - 13.6371px) 7.64798px, calc(50% - 12.446px) 8.89024px, calc(50% - 11.1451px) 10.01826px, calc(50% - 9.7428px) 11.02352px, calc(50% - 8.2475px) 11.8975px, calc(50% - 6.6676px) 12.63168px, calc(50% - 5.0115px) 13.21754px, calc(50% - 3.2876px) 13.64656px, calc(50% - 1.5043px) 13.91022px, calc(50% - -0.32999999999996px) 14px, calc(50% - -0.32999999999998px) 14px, calc(50% - -2.16431px) 13.9105px, calc(50% - -3.94768px) 13.6476px, calc(50% - -5.67177px) 13.2197px, calc(50% - -7.32824px) 12.6352px, calc(50% - -8.90875px) 11.9025px, calc(50% - -10.40496px) 11.03px, calc(50% - -11.80853px) 10.0261px, calc(50% - -13.11112px) 8.8992px, calc(50% - -14.30439px) 7.6577px, calc(50% - -15.38px) 6.31px, calc(50% - -15.38px) 6.31px, calc(50% - -16.27279px) 5.18562px, calc(50% - -17.25432px) 4.15616px, calc(50% - -18.31733px) 3.22714px, calc(50% - -19.45456px) 2.40408px, calc(50% - -20.65875px) 1.6925px, calc(50% - -21.92264px) 1.09792px, calc(50% - -23.23897px) 0.62586px, calc(50% - -24.60048px) 0.28184px, calc(50% - -25.99991px) 0.07138px, calc(50% - -27.43px) 8.9116630386686E-32px, calc(100% - 26.5px) 0px, calc(100% - 26.5px) 0px, calc(100% - 22.20048px) 0.34672px, calc(100% - 18.12224px) 1.35056px, calc(100% - 14.31976px) 2.95704px, calc(100% - 10.84752px) 5.11168px, calc(100% - 7.76px) 7.76px, calc(100% - 5.11168px) 10.84752px, calc(100% - 2.9570399999999px) 14.31976px, calc(100% - 1.35056px) 18.12224px, calc(100% - 0.34671999999995px) 22.20048px, calc(100% - 5.6843418860808E-14px) 26.5px); 
        }
        `
            : ""
        }
      </style>
    `;
  return c
    ? {
        styles: a,
        html: `
                  <div class="popup-wrapper">
        <button class="close-button" aria-label="Close popup">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16.98 16.98" width="80%" height="80%">
            <path fill="currentColor" d="M16.46,13.98c.69.68.69,1.8,0,2.48-.34.35-.79.52-1.24.52s-.89-.17-1.24-.52l-5.49-5.49-5.49,5.49c-.68.69-1.79.69-2.48,0-.35-.34-.52-.79-.52-1.24s.17-.9.52-1.24l5.49-5.49L.52,3C-.17,2.32-.17,1.2.52.52c.35-.35.79-.52,1.24-.52s.9.17,1.24.52l5.49,5.49L13.98.52c.69-.69,1.8-.69,2.48,0,.35.34.52.79.52,1.24s-.17.9-.52,1.24l-5.49,5.49,5.49,5.49Z"/>
          </svg>
        </button>
        <div class="popup-side popup-front">
        <svg class="popup-border-overlay" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 227.13V240.82C0 246.99 5 252 11.18 252H19.2C25.38 252 30.38 246.99 30.38 240.82C30.38 246.99 35.4 252 41.56 252H49.6C55.75 252 60.75 247.01 60.76 240.85C60.79 247.01 65.79 252 71.94 252H79.98C86.15 252 91.16 246.99 91.16 240.82C91.16 246.99 96.16 252 102.34 252H110.36C116.53 252 121.53 247.01 121.54 240.84C121.55 247.01 126.55 252 132.72 252H140.74C146.35 252 150.99 247.87 151.79 242.48C152.6 247.87 157.24 252 162.85 252H170.87C177.04 252 182.04 247 182.05 240.84C182.06 247 187.06 252 193.23 252H201.25C207.03 252 211.78 247.62 212.36 242C212.95 247.62 217.7 252 223.48 252H231.5C237.68 252 242.68 246.99 242.68 240.82C242.68 246.99 247.69 252 253.86 252H261.89C268.05 252 273.05 247.01 273.06 240.85C273.08 247.01 278.08 252 284.24 252H292.27C298.44 252 303.45 246.99 303.45 240.82C303.45 246.99 308.46 252 314.63 252H322.66C328.82 252 333.82 247.01 333.83 240.84C333.85 247.01 338.85 252 345.01 252H353.04C359.21 252 364.22 246.99 364.22 240.82V227.13C364.22 220.95 359.21 215.95 353.04 215.95C359.21 215.95 364.22 210.94 364.22 204.77V191.07C364.22 184.9 359.21 179.89 353.04 179.89C359.21 179.89 364.22 174.89 364.22 168.71V155.02C364.22 149.52 360.25 144.96 355.02 144.03C360.25 143.09 364.22 138.53 364.22 133.03V119.34C364.22 113.17 359.22 108.17 353.06 108.16C359.22 108.16 364.22 103.15 364.22 96.98V83.29C364.22 77.11 359.21 72.11 353.04 72.11C359.21 72.11 364.22 67.1 364.22 60.93V47.23C364.22 41.06 359.21 36.05 353.04 36.05C359.21 36.05 364.22 31.05 364.22 24.87V11.18C364.22 5.01 359.21 0 353.04 0H345.01C338.85 0 333.85 4.99 333.83 11.16C333.82 4.99 328.82 0 322.66 0H314.63C308.46 0 303.45 5.01 303.45 11.18C303.45 5.01 298.44 0 292.27 0H284.24C278.08 0 273.08 4.99 273.06 11.16C273.05 4.99 268.05 0 261.89 0H253.86C247.69 0 242.68 5.01 242.68 11.18C242.68 5.01 237.68 0 231.5 0H223.48C217.7 0 212.95 4.38 212.36 10C211.78 4.38 207.03 0 201.25 0H193.23C187.06 0 182.06 5 182.05 11.16C182.04 5 177.04 0 170.87 0H162.85C157.24 0 152.6 4.13 151.79 9.52C150.99 4.13 146.35 0 140.74 0H132.72C126.55 0 121.55 4.99 121.54 11.16C121.53 4.99 116.53 0 110.36 0H102.34C96.16 0 91.16 5.01 91.16 11.18C91.16 5.01 86.15 0 79.98 0H71.94C65.79 0 60.79 4.99 60.76 11.16C60.75 4.99 55.75 0 49.6 0H41.56C35.4 0 30.38 5.01 30.38 11.18C30.38 5.01 25.38 0 19.2 0H11.18C5 0 0 5.01 0 11.18V24.87C0 31.05 5 36.05 11.18 36.05C5 36.05 0 41.06 0 47.23V60.93C0 67.1 5 72.11 11.18 72.11C5 72.11 0 77.11 0 83.29V96.98C0 103.15 4.99 108.15 11.16 108.16C4.99 108.17 0 113.17 0 119.34V133.03C0 138.53 3.97 143.09 9.19 144.03C3.97 144.96 0 149.52 0 155.02V168.71C0 174.89 5 179.89 11.18 179.89C5 179.89 0 184.9 0 191.07V204.77C0 210.94 5 215.95 11.18 215.95C5 215.95 0 220.95 0 227.13ZM333.83 24.89C333.85 31.06 338.85 36.05 345.01 36.05C338.85 36.05 333.85 41.05 333.83 47.21C333.82 41.05 328.82 36.05 322.66 36.05C328.82 36.05 333.82 31.06 333.83 24.89ZM333.83 60.95C333.85 67.11 338.85 72.11 345.01 72.11C338.85 72.11 333.85 77.1 333.83 83.27C333.82 77.1 328.82 72.11 322.66 72.11C328.82 72.11 333.82 67.11 333.83 60.95ZM333.83 119.32C333.82 113.16 328.83 108.17 322.68 108.16C328.83 108.16 333.82 103.16 333.83 97C333.85 103.16 338.83 108.15 344.99 108.16C338.83 108.17 333.85 113.16 333.83 119.32ZM343.03 144.03C337.81 144.96 333.84 149.51 333.83 155C333.82 149.51 329.86 144.96 324.64 144.03C329.86 143.09 333.82 138.54 333.83 133.05C333.83 138.54 337.81 143.09 343.03 144.03ZM333.83 168.73C333.85 174.9 338.85 179.89 345.01 179.89C338.85 179.89 333.85 184.89 333.83 191.05C333.82 184.89 328.82 179.89 322.66 179.89C328.82 179.89 333.82 174.9 333.83 168.73ZM333.83 204.79C333.85 210.95 338.85 215.95 345.01 215.95C338.85 215.95 333.85 220.94 333.83 227.11C333.82 220.94 328.82 215.95 322.66 215.95C328.82 215.95 333.82 210.95 333.83 204.79ZM303.45 24.87C303.45 31.05 308.46 36.05 314.63 36.05C308.46 36.05 303.45 41.06 303.45 47.23C303.45 41.06 298.44 36.05 292.27 36.05C298.44 36.05 303.45 31.05 303.45 24.87ZM303.45 60.93C303.45 67.1 308.46 72.11 314.63 72.11C308.46 72.11 303.45 77.11 303.45 83.29C303.45 77.11 298.44 72.11 292.27 72.11C298.44 72.11 303.45 67.1 303.45 60.93ZM303.45 119.34C303.45 113.17 298.45 108.17 292.29 108.16C298.45 108.16 303.45 103.15 303.45 96.98C303.45 103.15 308.45 108.15 314.61 108.16C308.45 108.17 303.45 113.17 303.45 119.34ZM312.64 144.03C307.42 144.96 303.45 149.52 303.45 155.02C303.45 149.52 299.48 144.96 294.25 144.03C299.48 143.09 303.45 138.53 303.45 133.03C303.45 138.53 307.42 143.09 312.64 144.03ZM303.45 168.71C303.45 174.89 308.46 179.89 314.63 179.89C308.46 179.89 303.45 184.9 303.45 191.07C303.45 184.9 298.44 179.89 292.27 179.89C298.44 179.89 303.45 174.89 303.45 168.71ZM303.45 204.77C303.45 210.94 308.46 215.95 314.63 215.95C308.46 215.95 303.45 220.95 303.45 227.13C303.45 220.95 298.44 215.95 292.27 215.95C298.44 215.95 303.45 210.94 303.45 204.77ZM273.06 24.9C273.08 31.06 278.08 36.05 284.24 36.05C278.08 36.05 273.08 41.05 273.06 47.21C273.05 41.05 268.05 36.05 261.89 36.05C268.05 36.05 273.05 31.06 273.06 24.9ZM273.06 60.95C273.08 67.11 278.08 72.11 284.24 72.11C278.08 72.11 273.08 77.1 273.06 83.26C273.05 77.1 268.05 72.11 261.89 72.11C268.05 72.11 273.05 67.11 273.06 60.95ZM273.06 119.31C273.05 113.16 268.06 108.17 261.91 108.16C268.06 108.16 273.05 103.16 273.06 97.01C273.08 103.16 278.07 108.15 284.22 108.16C278.07 108.17 273.08 113.16 273.06 119.31ZM282.26 144.03C277.04 144.96 273.08 149.51 273.06 154.99C273.05 149.51 269.09 144.96 263.87 144.03C269.09 143.09 273.05 138.54 273.06 133.06C273.08 138.54 277.04 143.09 282.26 144.03ZM273.06 168.74C273.08 174.9 278.08 179.89 284.24 179.89C278.08 179.89 273.08 184.89 273.06 191.05C273.05 184.89 268.05 179.89 261.89 179.89C268.05 179.89 273.05 174.9 273.06 168.74ZM273.06 204.79C273.08 210.95 278.08 215.95 284.24 215.95C278.08 215.95 273.08 220.94 273.06 227.1C273.05 220.94 268.05 215.95 261.89 215.95C268.05 215.95 273.05 210.95 273.06 204.79ZM242.68 24.87C242.68 31.05 247.69 36.05 253.86 36.05C247.69 36.05 242.68 41.06 242.68 47.23C242.68 41.06 237.68 36.05 231.5 36.05C237.68 36.05 242.68 31.05 242.68 24.87ZM242.68 60.93C242.68 67.1 247.69 72.11 253.86 72.11C247.69 72.11 242.68 77.11 242.68 83.29C242.68 77.11 237.68 72.11 231.5 72.11C237.68 72.11 242.68 67.1 242.68 60.93ZM242.68 119.34C242.68 113.17 237.69 108.17 231.52 108.16C237.69 108.16 242.68 103.15 242.68 96.98C242.68 103.15 247.68 108.15 253.84 108.16C247.68 108.17 242.68 113.17 242.68 119.34ZM251.87 144.03C246.65 144.96 242.68 149.52 242.68 155.02C242.68 149.52 238.71 144.96 233.49 144.03C238.71 143.09 242.68 138.53 242.68 133.03C242.68 138.53 246.65 143.09 251.87 144.03ZM242.68 168.71C242.68 174.89 247.69 179.89 253.86 179.89C247.69 179.89 242.68 184.9 242.68 191.07C242.68 184.9 237.68 179.89 231.5 179.89C237.68 179.89 242.68 174.89 242.68 168.71ZM242.68 204.77C242.68 210.94 247.69 215.95 253.86 215.95C247.69 215.95 242.68 220.95 242.68 227.13C242.68 220.95 237.68 215.95 231.5 215.95C237.68 215.95 242.68 210.94 242.68 204.77ZM212.36 26.05C212.95 31.68 217.7 36.05 223.48 36.05C217.7 36.05 212.95 40.43 212.36 46.05C211.78 40.43 207.03 36.05 201.25 36.05C207.03 36.05 211.78 31.68 212.36 26.05ZM212.36 62.11C212.95 67.73 217.7 72.11 223.48 72.11C217.7 72.11 212.95 76.48 212.36 82.11C211.78 76.48 207.03 72.11 201.25 72.11C207.03 72.11 211.78 67.73 212.36 62.11ZM212.36 118.16C211.78 112.54 207.04 108.17 201.28 108.16C207.04 108.16 211.78 103.78 212.36 98.16C212.95 103.78 217.69 108.15 223.46 108.16C217.69 108.17 212.95 112.54 212.36 118.16ZM221.49 144.03C216.64 144.89 212.88 148.88 212.36 153.85C211.86 148.88 208.1 144.89 203.24 144.03C208.1 143.16 211.86 139.17 212.36 134.2C212.88 139.17 216.64 143.16 221.49 144.03ZM212.36 169.89C212.95 175.52 217.7 179.89 223.48 179.89C217.7 179.89 212.95 184.27 212.36 189.89C211.78 184.27 207.03 179.89 201.25 179.89C207.03 179.89 211.78 175.52 212.36 169.89ZM212.36 205.95C212.95 211.57 217.7 215.95 223.48 215.95C217.7 215.95 212.95 220.32 212.36 225.95C211.78 220.32 207.03 215.95 201.25 215.95C207.03 215.95 211.78 211.57 212.36 205.95ZM182.05 24.89C182.06 31.06 187.06 36.05 193.23 36.05C187.06 36.05 182.06 41.05 182.05 47.22C182.04 41.05 177.04 36.05 170.87 36.05C177.04 36.05 182.04 31.06 182.05 24.89ZM182.05 60.95C182.06 67.11 187.06 72.11 193.23 72.11C187.06 72.11 182.06 77.1 182.05 83.27C182.04 77.1 177.04 72.11 170.87 72.11C177.04 72.11 182.04 67.11 182.05 60.95ZM182.05 119.32C182.04 113.16 177.05 108.17 170.9 108.16C177.05 108.16 182.04 103.16 182.05 97C182.06 103.16 187.05 108.15 193.22 108.16C187.05 108.17 182.06 113.16 182.05 119.32ZM191.24 144.03C186.03 144.96 182.06 149.51 182.05 155C182.04 149.51 178.09 144.96 172.86 144.03C178.09 143.09 182.04 138.54 182.05 133.05C182.06 138.54 186.03 143.09 191.24 144.03ZM182.05 168.73C182.06 174.9 187.06 179.89 193.23 179.89C187.06 179.89 182.06 184.89 182.05 191.05C182.04 184.89 177.04 179.89 170.87 179.89C177.04 179.89 182.04 174.9 182.05 168.73ZM182.05 204.79C182.06 210.95 187.06 215.95 193.23 215.95C187.06 215.95 182.06 220.94 182.05 227.11C182.04 220.94 177.04 215.95 170.87 215.95C177.04 215.95 182.04 210.95 182.05 204.79ZM151.79 26.53C152.6 31.92 157.24 36.05 162.85 36.05C157.24 36.05 152.6 40.18 151.79 45.57C150.99 40.18 146.35 36.05 140.74 36.05C146.35 36.05 150.99 31.92 151.79 26.53ZM151.79 62.59C152.6 67.98 157.24 72.11 162.85 72.11C157.24 72.11 152.6 76.24 151.79 81.63C150.99 76.24 146.35 72.11 140.74 72.11C146.35 72.11 150.99 67.98 151.79 62.59ZM151.79 117.68C151 112.3 146.36 108.17 140.76 108.16C146.36 108.16 151 104.02 151.79 98.64C152.6 104.02 157.23 108.15 162.84 108.16C157.23 108.17 152.6 112.3 151.79 117.68ZM160.86 144.03C156.18 144.86 152.5 148.62 151.79 153.35C151.1 148.62 147.41 144.86 142.73 144.03C147.41 143.19 151.1 139.43 151.79 134.7C152.5 139.43 156.18 143.19 160.86 144.03ZM151.79 170.37C152.6 175.76 157.24 179.89 162.85 179.89C157.24 179.89 152.6 184.02 151.79 189.41C150.99 184.02 146.35 179.89 140.74 179.89C146.35 179.89 150.99 175.76 151.79 170.37ZM151.79 206.43C152.6 211.82 157.24 215.95 162.85 215.95C157.24 215.95 152.6 220.08 151.79 225.47C150.99 220.08 146.35 215.95 140.74 215.95C146.35 215.95 150.99 211.82 151.79 206.43ZM121.54 24.89C121.55 31.06 126.55 36.05 132.72 36.05C126.55 36.05 121.55 41.05 121.54 47.21C121.53 41.05 116.53 36.05 110.36 36.05C116.53 36.05 121.53 31.06 121.54 24.89ZM121.54 60.95C121.55 67.11 126.55 72.11 132.72 72.11C126.55 72.11 121.55 77.1 121.54 83.27C121.53 77.1 116.53 72.11 110.36 72.11C116.53 72.11 121.53 67.11 121.54 60.95ZM121.54 119.32C121.53 113.16 116.54 108.17 110.38 108.16C116.54 108.16 121.53 103.16 121.54 97C121.55 103.16 126.54 108.15 132.69 108.16C126.54 108.17 121.55 113.16 121.54 119.32ZM130.73 144.03C125.51 144.96 121.54 149.51 121.54 155C121.53 149.51 117.56 144.96 112.35 144.03C117.56 143.09 121.53 138.54 121.54 133.05C121.54 138.54 125.51 143.09 130.73 144.03ZM121.54 168.73C121.55 174.9 126.55 179.89 132.72 179.89C126.55 179.89 121.55 184.89 121.54 191.05C121.53 184.89 116.53 179.89 110.36 179.89C116.53 179.89 121.53 174.9 121.54 168.73ZM121.54 204.79C121.55 210.95 126.55 215.95 132.72 215.95C126.55 215.95 121.55 220.94 121.54 227.11C121.53 220.94 116.53 215.95 110.36 215.95C116.53 215.95 121.53 210.95 121.54 204.79ZM91.16 24.87C91.16 31.05 96.16 36.05 102.34 36.05C96.16 36.05 91.16 41.06 91.16 47.23C91.16 41.06 86.15 36.05 79.98 36.05C86.15 36.05 91.16 31.05 91.16 24.87ZM91.16 60.93C91.16 67.1 96.16 72.11 102.34 72.11C96.16 72.11 91.16 77.11 91.16 83.29C91.16 77.11 86.15 72.11 79.98 72.11C86.15 72.11 91.16 67.1 91.16 60.93ZM91.16 119.34C91.16 113.17 86.16 108.17 79.99 108.16C86.16 108.16 91.16 103.15 91.16 96.98C91.16 103.15 96.16 108.15 102.31 108.16C96.16 108.17 91.16 113.17 91.16 119.34ZM100.35 144.03C95.12 144.96 91.16 149.52 91.16 155.02C91.16 149.52 87.18 144.96 81.95 144.03C87.18 143.09 91.16 138.53 91.16 133.03C91.16 138.53 95.12 143.09 100.35 144.03ZM91.16 168.71C91.16 174.89 96.16 179.89 102.34 179.89C96.16 179.89 91.16 184.9 91.16 191.07C91.16 184.9 86.15 179.89 79.98 179.89C86.15 179.89 91.16 174.89 91.16 168.71ZM91.16 204.77C91.16 210.94 96.16 215.95 102.34 215.95C96.16 215.95 91.16 220.95 91.16 227.13C91.16 220.95 86.15 215.95 79.98 215.95C86.15 215.95 91.16 210.94 91.16 204.77ZM60.76 24.9C60.79 31.06 65.79 36.05 71.94 36.05C65.79 36.05 60.79 41.05 60.76 47.21C60.75 41.05 55.75 36.05 49.6 36.05C55.75 36.05 60.75 31.06 60.76 24.9ZM60.76 60.95C60.79 67.11 65.79 72.11 71.94 72.11C65.79 72.11 60.79 77.1 60.76 83.26C60.75 77.1 55.75 72.11 49.6 72.11C55.75 72.11 60.75 67.11 60.76 60.95ZM60.76 119.31C60.75 113.16 55.76 108.17 49.61 108.16C55.76 108.16 60.75 103.16 60.76 97.01C60.79 103.16 65.78 108.15 71.92 108.16C65.78 108.17 60.79 113.16 60.76 119.31ZM69.97 144.03C64.74 144.96 60.79 149.51 60.76 154.99C60.75 149.51 56.79 144.96 51.57 144.03C56.79 143.09 60.75 138.54 60.76 133.06C60.79 138.54 64.74 143.09 69.97 144.03ZM60.76 168.74C60.79 174.9 65.79 179.89 71.94 179.89C65.79 179.89 60.79 184.89 60.76 191.05C60.75 184.89 55.75 179.89 49.6 179.89C55.75 179.89 60.75 174.9 60.76 168.74ZM60.76 204.79C60.79 210.95 65.79 215.95 71.94 215.95C65.79 215.95 60.79 220.94 60.76 227.1C60.75 220.94 55.75 215.95 49.6 215.95C55.75 215.95 60.75 210.95 60.76 204.79ZM30.38 24.87C30.38 31.05 35.4 36.05 41.56 36.05C35.4 36.05 30.38 41.06 30.38 47.23C30.38 41.06 25.38 36.05 19.2 36.05C25.38 36.05 30.38 31.05 30.38 24.87ZM30.38 60.93C30.38 67.1 35.4 72.11 41.56 72.11C35.4 72.11 30.38 77.11 30.38 83.29C30.38 77.11 25.38 72.11 19.2 72.11C25.38 72.11 30.38 67.1 30.38 60.93ZM30.38 119.34C30.38 113.17 25.4 108.17 19.23 108.16C25.4 108.16 30.38 103.15 30.38 96.98C30.38 103.15 35.38 108.15 41.54 108.16C35.38 108.17 30.38 113.17 30.38 119.34ZM39.57 144.03C34.35 144.96 30.38 149.52 30.38 155.02C30.38 149.52 26.41 144.96 21.19 144.03C26.41 143.09 30.38 138.53 30.38 133.03C30.38 138.53 34.35 143.09 39.57 144.03ZM30.38 168.71C30.38 174.89 35.4 179.89 41.56 179.89C35.4 179.89 30.38 184.9 30.38 191.07C30.38 184.9 25.38 179.89 19.2 179.89C25.38 179.89 30.38 174.89 30.38 168.71ZM30.38 204.77C30.38 210.94 35.4 215.95 41.56 215.95C35.4 215.95 30.38 220.95 30.38 227.13C30.38 220.95 25.38 215.95 19.2 215.95C25.38 215.95 30.38 210.94 30.38 204.77Z" fill="url(#paint0_linear_3248_5)"/>
<defs>
  <linearGradient id="paint0_linear_3248_5" x1="182.11" y1="0" x2="182.11" y2="252" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${_.color}" stop-opacity="0" />
        <stop offset="0.3" stop-color="${_.color}" stop-opacity="1" />
      </linearGradient>
</defs>
</svg>
          ${
            _.image
              ? `<img src="${_.image}" class="popup-background-image" alt="">`
              : ""
          }
          <div class="content-wrapper">
            <div class="popup-title">${_.name}</div>
            <div class="popup-description-ar"></div>
${
  _.image
    ? `<button class="impressie-button button-base" onclick="window.open('${_.link_ar}', '_blank')">Start AR</button>`
    : ""
}            <button class="more-info-button button-base">Meer info</button>
          </div>
          </div>
          
     <div class="popup-side popup-back">
  <div class="content-wrapper">

    <div class="popup-title details">${_.name}</div>
    <div class="info-content">
      <!-- Contact info in een description list voor betere semantiek -->
      <dl class="contact-container">
        <div class="info-row">
  <button class="more-info-button button-base">Terug</button>
</div>
            `,
      }
    : {
        styles: a,
        html: `
            <div class="popup-wrapper">
        <button class="close-button" aria-label="Close popup">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16.98 16.98" width="80%" height="80%">
            <path fill="currentColor" d="M16.46,13.98c.69.68.69,1.8,0,2.48-.34.35-.79.52-1.24.52s-.89-.17-1.24-.52l-5.49-5.49-5.49,5.49c-.68.69-1.79.69-2.48,0-.35-.34-.52-.79-.52-1.24s.17-.9.52-1.24l5.49-5.49L.52,3C-.17,2.32-.17,1.2.52.52c.35-.35.79-.52,1.24-.52s.9.17,1.24.52l5.49,5.49L13.98.52c.69-.69,1.8-.69,2.48,0,.35.34.52.79.52,1.24s-.17.9-.52,1.24l-5.49,5.49,5.49,5.49Z"/>
          </svg>
        </button>
        <div class="popup-side popup-front">
        <svg class="popup-border-overlay" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 227.13V240.82C0 246.99 5 252 11.18 252H19.2C25.38 252 30.38 246.99 30.38 240.82C30.38 246.99 35.4 252 41.56 252H49.6C55.75 252 60.75 247.01 60.76 240.85C60.79 247.01 65.79 252 71.94 252H79.98C86.15 252 91.16 246.99 91.16 240.82C91.16 246.99 96.16 252 102.34 252H110.36C116.53 252 121.53 247.01 121.54 240.84C121.55 247.01 126.55 252 132.72 252H140.74C146.35 252 150.99 247.87 151.79 242.48C152.6 247.87 157.24 252 162.85 252H170.87C177.04 252 182.04 247 182.05 240.84C182.06 247 187.06 252 193.23 252H201.25C207.03 252 211.78 247.62 212.36 242C212.95 247.62 217.7 252 223.48 252H231.5C237.68 252 242.68 246.99 242.68 240.82C242.68 246.99 247.69 252 253.86 252H261.89C268.05 252 273.05 247.01 273.06 240.85C273.08 247.01 278.08 252 284.24 252H292.27C298.44 252 303.45 246.99 303.45 240.82C303.45 246.99 308.46 252 314.63 252H322.66C328.82 252 333.82 247.01 333.83 240.84C333.85 247.01 338.85 252 345.01 252H353.04C359.21 252 364.22 246.99 364.22 240.82V227.13C364.22 220.95 359.21 215.95 353.04 215.95C359.21 215.95 364.22 210.94 364.22 204.77V191.07C364.22 184.9 359.21 179.89 353.04 179.89C359.21 179.89 364.22 174.89 364.22 168.71V155.02C364.22 149.52 360.25 144.96 355.02 144.03C360.25 143.09 364.22 138.53 364.22 133.03V119.34C364.22 113.17 359.22 108.17 353.06 108.16C359.22 108.16 364.22 103.15 364.22 96.98V83.29C364.22 77.11 359.21 72.11 353.04 72.11C359.21 72.11 364.22 67.1 364.22 60.93V47.23C364.22 41.06 359.21 36.05 353.04 36.05C359.21 36.05 364.22 31.05 364.22 24.87V11.18C364.22 5.01 359.21 0 353.04 0H345.01C338.85 0 333.85 4.99 333.83 11.16C333.82 4.99 328.82 0 322.66 0H314.63C308.46 0 303.45 5.01 303.45 11.18C303.45 5.01 298.44 0 292.27 0H284.24C278.08 0 273.08 4.99 273.06 11.16C273.05 4.99 268.05 0 261.89 0H253.86C247.69 0 242.68 5.01 242.68 11.18C242.68 5.01 237.68 0 231.5 0H223.48C217.7 0 212.95 4.38 212.36 10C211.78 4.38 207.03 0 201.25 0H193.23C187.06 0 182.06 5 182.05 11.16C182.04 5 177.04 0 170.87 0H162.85C157.24 0 152.6 4.13 151.79 9.52C150.99 4.13 146.35 0 140.74 0H132.72C126.55 0 121.55 4.99 121.54 11.16C121.53 4.99 116.53 0 110.36 0H102.34C96.16 0 91.16 5.01 91.16 11.18C91.16 5.01 86.15 0 79.98 0H71.94C65.79 0 60.79 4.99 60.76 11.16C60.75 4.99 55.75 0 49.6 0H41.56C35.4 0 30.38 5.01 30.38 11.18C30.38 5.01 25.38 0 19.2 0H11.18C5 0 0 5.01 0 11.18V24.87C0 31.05 5 36.05 11.18 36.05C5 36.05 0 41.06 0 47.23V60.93C0 67.1 5 72.11 11.18 72.11C5 72.11 0 77.11 0 83.29V96.98C0 103.15 4.99 108.15 11.16 108.16C4.99 108.17 0 113.17 0 119.34V133.03C0 138.53 3.97 143.09 9.19 144.03C3.97 144.96 0 149.52 0 155.02V168.71C0 174.89 5 179.89 11.18 179.89C5 179.89 0 184.9 0 191.07V204.77C0 210.94 5 215.95 11.18 215.95C5 215.95 0 220.95 0 227.13ZM333.83 24.89C333.85 31.06 338.85 36.05 345.01 36.05C338.85 36.05 333.85 41.05 333.83 47.21C333.82 41.05 328.82 36.05 322.66 36.05C328.82 36.05 333.82 31.06 333.83 24.89ZM333.83 60.95C333.85 67.11 338.85 72.11 345.01 72.11C338.85 72.11 333.85 77.1 333.83 83.27C333.82 77.1 328.82 72.11 322.66 72.11C328.82 72.11 333.82 67.11 333.83 60.95ZM333.83 119.32C333.82 113.16 328.83 108.17 322.68 108.16C328.83 108.16 333.82 103.16 333.83 97C333.85 103.16 338.83 108.15 344.99 108.16C338.83 108.17 333.85 113.16 333.83 119.32ZM343.03 144.03C337.81 144.96 333.84 149.51 333.83 155C333.82 149.51 329.86 144.96 324.64 144.03C329.86 143.09 333.82 138.54 333.83 133.05C333.83 138.54 337.81 143.09 343.03 144.03ZM333.83 168.73C333.85 174.9 338.85 179.89 345.01 179.89C338.85 179.89 333.85 184.89 333.83 191.05C333.82 184.89 328.82 179.89 322.66 179.89C328.82 179.89 333.82 174.9 333.83 168.73ZM333.83 204.79C333.85 210.95 338.85 215.95 345.01 215.95C338.85 215.95 333.85 220.94 333.83 227.11C333.82 220.94 328.82 215.95 322.66 215.95C328.82 215.95 333.82 210.95 333.83 204.79ZM303.45 24.87C303.45 31.05 308.46 36.05 314.63 36.05C308.46 36.05 303.45 41.06 303.45 47.23C303.45 41.06 298.44 36.05 292.27 36.05C298.44 36.05 303.45 31.05 303.45 24.87ZM303.45 60.93C303.45 67.1 308.46 72.11 314.63 72.11C308.46 72.11 303.45 77.11 303.45 83.29C303.45 77.11 298.44 72.11 292.27 72.11C298.44 72.11 303.45 67.1 303.45 60.93ZM303.45 119.34C303.45 113.17 298.45 108.17 292.29 108.16C298.45 108.16 303.45 103.15 303.45 96.98C303.45 103.15 308.45 108.15 314.61 108.16C308.45 108.17 303.45 113.17 303.45 119.34ZM312.64 144.03C307.42 144.96 303.45 149.52 303.45 155.02C303.45 149.52 299.48 144.96 294.25 144.03C299.48 143.09 303.45 138.53 303.45 133.03C303.45 138.53 307.42 143.09 312.64 144.03ZM303.45 168.71C303.45 174.89 308.46 179.89 314.63 179.89C308.46 179.89 303.45 184.9 303.45 191.07C303.45 184.9 298.44 179.89 292.27 179.89C298.44 179.89 303.45 174.89 303.45 168.71ZM303.45 204.77C303.45 210.94 308.46 215.95 314.63 215.95C308.46 215.95 303.45 220.95 303.45 227.13C303.45 220.95 298.44 215.95 292.27 215.95C298.44 215.95 303.45 210.94 303.45 204.77ZM273.06 24.9C273.08 31.06 278.08 36.05 284.24 36.05C278.08 36.05 273.08 41.05 273.06 47.21C273.05 41.05 268.05 36.05 261.89 36.05C268.05 36.05 273.05 31.06 273.06 24.9ZM273.06 60.95C273.08 67.11 278.08 72.11 284.24 72.11C278.08 72.11 273.08 77.1 273.06 83.26C273.05 77.1 268.05 72.11 261.89 72.11C268.05 72.11 273.05 67.11 273.06 60.95ZM273.06 119.31C273.05 113.16 268.06 108.17 261.91 108.16C268.06 108.16 273.05 103.16 273.06 97.01C273.08 103.16 278.07 108.15 284.22 108.16C278.07 108.17 273.08 113.16 273.06 119.31ZM282.26 144.03C277.04 144.96 273.08 149.51 273.06 154.99C273.05 149.51 269.09 144.96 263.87 144.03C269.09 143.09 273.05 138.54 273.06 133.06C273.08 138.54 277.04 143.09 282.26 144.03ZM273.06 168.74C273.08 174.9 278.08 179.89 284.24 179.89C278.08 179.89 273.08 184.89 273.06 191.05C273.05 184.89 268.05 179.89 261.89 179.89C268.05 179.89 273.05 174.9 273.06 168.74ZM273.06 204.79C273.08 210.95 278.08 215.95 284.24 215.95C278.08 215.95 273.08 220.94 273.06 227.1C273.05 220.94 268.05 215.95 261.89 215.95C268.05 215.95 273.05 210.95 273.06 204.79ZM242.68 24.87C242.68 31.05 247.69 36.05 253.86 36.05C247.69 36.05 242.68 41.06 242.68 47.23C242.68 41.06 237.68 36.05 231.5 36.05C237.68 36.05 242.68 31.05 242.68 24.87ZM242.68 60.93C242.68 67.1 247.69 72.11 253.86 72.11C247.69 72.11 242.68 77.11 242.68 83.29C242.68 77.11 237.68 72.11 231.5 72.11C237.68 72.11 242.68 67.1 242.68 60.93ZM242.68 119.34C242.68 113.17 237.69 108.17 231.52 108.16C237.69 108.16 242.68 103.15 242.68 96.98C242.68 103.15 247.68 108.15 253.84 108.16C247.68 108.17 242.68 113.17 242.68 119.34ZM251.87 144.03C246.65 144.96 242.68 149.52 242.68 155.02C242.68 149.52 238.71 144.96 233.49 144.03C238.71 143.09 242.68 138.53 242.68 133.03C242.68 138.53 246.65 143.09 251.87 144.03ZM242.68 168.71C242.68 174.89 247.69 179.89 253.86 179.89C247.69 179.89 242.68 184.9 242.68 191.07C242.68 184.9 237.68 179.89 231.5 179.89C237.68 179.89 242.68 174.89 242.68 168.71ZM242.68 204.77C242.68 210.94 247.69 215.95 253.86 215.95C247.69 215.95 242.68 220.95 242.68 227.13C242.68 220.95 237.68 215.95 231.5 215.95C237.68 215.95 242.68 210.94 242.68 204.77ZM212.36 26.05C212.95 31.68 217.7 36.05 223.48 36.05C217.7 36.05 212.95 40.43 212.36 46.05C211.78 40.43 207.03 36.05 201.25 36.05C207.03 36.05 211.78 31.68 212.36 26.05ZM212.36 62.11C212.95 67.73 217.7 72.11 223.48 72.11C217.7 72.11 212.95 76.48 212.36 82.11C211.78 76.48 207.03 72.11 201.25 72.11C207.03 72.11 211.78 67.73 212.36 62.11ZM212.36 118.16C211.78 112.54 207.04 108.17 201.28 108.16C207.04 108.16 211.78 103.78 212.36 98.16C212.95 103.78 217.69 108.15 223.46 108.16C217.69 108.17 212.95 112.54 212.36 118.16ZM221.49 144.03C216.64 144.89 212.88 148.88 212.36 153.85C211.86 148.88 208.1 144.89 203.24 144.03C208.1 143.16 211.86 139.17 212.36 134.2C212.88 139.17 216.64 143.16 221.49 144.03ZM212.36 169.89C212.95 175.52 217.7 179.89 223.48 179.89C217.7 179.89 212.95 184.27 212.36 189.89C211.78 184.27 207.03 179.89 201.25 179.89C207.03 179.89 211.78 175.52 212.36 169.89ZM212.36 205.95C212.95 211.57 217.7 215.95 223.48 215.95C217.7 215.95 212.95 220.32 212.36 225.95C211.78 220.32 207.03 215.95 201.25 215.95C207.03 215.95 211.78 211.57 212.36 205.95ZM182.05 24.89C182.06 31.06 187.06 36.05 193.23 36.05C187.06 36.05 182.06 41.05 182.05 47.22C182.04 41.05 177.04 36.05 170.87 36.05C177.04 36.05 182.04 31.06 182.05 24.89ZM182.05 60.95C182.06 67.11 187.06 72.11 193.23 72.11C187.06 72.11 182.06 77.1 182.05 83.27C182.04 77.1 177.04 72.11 170.87 72.11C177.04 72.11 182.04 67.11 182.05 60.95ZM182.05 119.32C182.04 113.16 177.05 108.17 170.9 108.16C177.05 108.16 182.04 103.16 182.05 97C182.06 103.16 187.05 108.15 193.22 108.16C187.05 108.17 182.06 113.16 182.05 119.32ZM191.24 144.03C186.03 144.96 182.06 149.51 182.05 155C182.04 149.51 178.09 144.96 172.86 144.03C178.09 143.09 182.04 138.54 182.05 133.05C182.06 138.54 186.03 143.09 191.24 144.03ZM182.05 168.73C182.06 174.9 187.06 179.89 193.23 179.89C187.06 179.89 182.06 184.89 182.05 191.05C182.04 184.89 177.04 179.89 170.87 179.89C177.04 179.89 182.04 174.9 182.05 168.73ZM182.05 204.79C182.06 210.95 187.06 215.95 193.23 215.95C187.06 215.95 182.06 220.94 182.05 227.11C182.04 220.94 177.04 215.95 170.87 215.95C177.04 215.95 182.04 210.95 182.05 204.79ZM151.79 26.53C152.6 31.92 157.24 36.05 162.85 36.05C157.24 36.05 152.6 40.18 151.79 45.57C150.99 40.18 146.35 36.05 140.74 36.05C146.35 36.05 150.99 31.92 151.79 26.53ZM151.79 62.59C152.6 67.98 157.24 72.11 162.85 72.11C157.24 72.11 152.6 76.24 151.79 81.63C150.99 76.24 146.35 72.11 140.74 72.11C146.35 72.11 150.99 67.98 151.79 62.59ZM151.79 117.68C151 112.3 146.36 108.17 140.76 108.16C146.36 108.16 151 104.02 151.79 98.64C152.6 104.02 157.23 108.15 162.84 108.16C157.23 108.17 152.6 112.3 151.79 117.68ZM160.86 144.03C156.18 144.86 152.5 148.62 151.79 153.35C151.1 148.62 147.41 144.86 142.73 144.03C147.41 143.19 151.1 139.43 151.79 134.7C152.5 139.43 156.18 143.19 160.86 144.03ZM151.79 170.37C152.6 175.76 157.24 179.89 162.85 179.89C157.24 179.89 152.6 184.02 151.79 189.41C150.99 184.02 146.35 179.89 140.74 179.89C146.35 179.89 150.99 175.76 151.79 170.37ZM151.79 206.43C152.6 211.82 157.24 215.95 162.85 215.95C157.24 215.95 152.6 220.08 151.79 225.47C150.99 220.08 146.35 215.95 140.74 215.95C146.35 215.95 150.99 211.82 151.79 206.43ZM121.54 24.89C121.55 31.06 126.55 36.05 132.72 36.05C126.55 36.05 121.55 41.05 121.54 47.21C121.53 41.05 116.53 36.05 110.36 36.05C116.53 36.05 121.53 31.06 121.54 24.89ZM121.54 60.95C121.55 67.11 126.55 72.11 132.72 72.11C126.55 72.11 121.55 77.1 121.54 83.27C121.53 77.1 116.53 72.11 110.36 72.11C116.53 72.11 121.53 67.11 121.54 60.95ZM121.54 119.32C121.53 113.16 116.54 108.17 110.38 108.16C116.54 108.16 121.53 103.16 121.54 97C121.55 103.16 126.54 108.15 132.69 108.16C126.54 108.17 121.55 113.16 121.54 119.32ZM130.73 144.03C125.51 144.96 121.54 149.51 121.54 155C121.53 149.51 117.56 144.96 112.35 144.03C117.56 143.09 121.53 138.54 121.54 133.05C121.54 138.54 125.51 143.09 130.73 144.03ZM121.54 168.73C121.55 174.9 126.55 179.89 132.72 179.89C126.55 179.89 121.55 184.89 121.54 191.05C121.53 184.89 116.53 179.89 110.36 179.89C116.53 179.89 121.53 174.9 121.54 168.73ZM121.54 204.79C121.55 210.95 126.55 215.95 132.72 215.95C126.55 215.95 121.55 220.94 121.54 227.11C121.53 220.94 116.53 215.95 110.36 215.95C116.53 215.95 121.53 210.95 121.54 204.79ZM91.16 24.87C91.16 31.05 96.16 36.05 102.34 36.05C96.16 36.05 91.16 41.06 91.16 47.23C91.16 41.06 86.15 36.05 79.98 36.05C86.15 36.05 91.16 31.05 91.16 24.87ZM91.16 60.93C91.16 67.1 96.16 72.11 102.34 72.11C96.16 72.11 91.16 77.11 91.16 83.29C91.16 77.11 86.15 72.11 79.98 72.11C86.15 72.11 91.16 67.1 91.16 60.93ZM91.16 119.34C91.16 113.17 86.16 108.17 79.99 108.16C86.16 108.16 91.16 103.15 91.16 96.98C91.16 103.15 96.16 108.15 102.31 108.16C96.16 108.17 91.16 113.17 91.16 119.34ZM100.35 144.03C95.12 144.96 91.16 149.52 91.16 155.02C91.16 149.52 87.18 144.96 81.95 144.03C87.18 143.09 91.16 138.53 91.16 133.03C91.16 138.53 95.12 143.09 100.35 144.03ZM91.16 168.71C91.16 174.89 96.16 179.89 102.34 179.89C96.16 179.89 91.16 184.9 91.16 191.07C91.16 184.9 86.15 179.89 79.98 179.89C86.15 179.89 91.16 174.89 91.16 168.71ZM91.16 204.77C91.16 210.94 96.16 215.95 102.34 215.95C96.16 215.95 91.16 220.95 91.16 227.13C91.16 220.95 86.15 215.95 79.98 215.95C86.15 215.95 91.16 210.94 91.16 204.77ZM60.76 24.9C60.79 31.06 65.79 36.05 71.94 36.05C65.79 36.05 60.79 41.05 60.76 47.21C60.75 41.05 55.75 36.05 49.6 36.05C55.75 36.05 60.75 31.06 60.76 24.9ZM60.76 60.95C60.79 67.11 65.79 72.11 71.94 72.11C65.79 72.11 60.79 77.1 60.76 83.26C60.75 77.1 55.75 72.11 49.6 72.11C55.75 72.11 60.75 67.11 60.76 60.95ZM60.76 119.31C60.75 113.16 55.76 108.17 49.61 108.16C55.76 108.16 60.75 103.16 60.76 97.01C60.79 103.16 65.78 108.15 71.92 108.16C65.78 108.17 60.79 113.16 60.76 119.31ZM69.97 144.03C64.74 144.96 60.79 149.51 60.76 154.99C60.75 149.51 56.79 144.96 51.57 144.03C56.79 143.09 60.75 138.54 60.76 133.06C60.79 138.54 64.74 143.09 69.97 144.03ZM60.76 168.74C60.79 174.9 65.79 179.89 71.94 179.89C65.79 179.89 60.79 184.89 60.76 191.05C60.75 184.89 55.75 179.89 49.6 179.89C55.75 179.89 60.75 174.9 60.76 168.74ZM60.76 204.79C60.79 210.95 65.79 215.95 71.94 215.95C65.79 215.95 60.79 220.94 60.76 227.1C60.75 220.94 55.75 215.95 49.6 215.95C55.75 215.95 60.75 210.95 60.76 204.79ZM30.38 24.87C30.38 31.05 35.4 36.05 41.56 36.05C35.4 36.05 30.38 41.06 30.38 47.23C30.38 41.06 25.38 36.05 19.2 36.05C25.38 36.05 30.38 31.05 30.38 24.87ZM30.38 60.93C30.38 67.1 35.4 72.11 41.56 72.11C35.4 72.11 30.38 77.11 30.38 83.29C30.38 77.11 25.38 72.11 19.2 72.11C25.38 72.11 30.38 67.1 30.38 60.93ZM30.38 119.34C30.38 113.17 25.4 108.17 19.23 108.16C25.4 108.16 30.38 103.15 30.38 96.98C30.38 103.15 35.38 108.15 41.54 108.16C35.38 108.17 30.38 113.17 30.38 119.34ZM39.57 144.03C34.35 144.96 30.38 149.52 30.38 155.02C30.38 149.52 26.41 144.96 21.19 144.03C26.41 143.09 30.38 138.53 30.38 133.03C30.38 138.53 34.35 143.09 39.57 144.03ZM30.38 168.71C30.38 174.89 35.4 179.89 41.56 179.89C35.4 179.89 30.38 184.9 30.38 191.07C30.38 184.9 25.38 179.89 19.2 179.89C25.38 179.89 30.38 174.89 30.38 168.71ZM30.38 204.77C30.38 210.94 35.4 215.95 41.56 215.95C35.4 215.95 30.38 220.95 30.38 227.13C30.38 220.95 25.38 215.95 19.2 215.95C25.38 215.95 30.38 210.94 30.38 204.77Z" fill="url(#paint0_linear_3248_5)"/>
<defs>
  <linearGradient id="paint0_linear_3248_5" x1="182.11" y1="0" x2="182.11" y2="252" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${_.color}" stop-opacity="0" />
        <stop offset="0.3" stop-color="${_.color}" stop-opacity="1" />
      </linearGradient>
</defs>
</svg>
          ${
            _.image
              ? `<img src="${_.image}" class="popup-background-image" alt="">`
              : ""
          }
          <div class="content-wrapper">
            <div class="popup-title">${_.name}</div>
            <div class="popup-description">${_.description}</div>
            ${
              _.image
                ? '<button class="impressie-button button-base">Impressie</button>'
                : ""
            }
            <button class="more-info-button button-base">Meer info</button>
          </div>
          </div>
          
     <div class="popup-side popup-back">
  <div class="content-wrapper">

    <div class="popup-title details">${_.name || 'Naam niet beschikbaar'}</div>
  <div class="info-content">
    <dl class="contact-container">
      <div class="info-row">
        <dt>ADRESS</dt>
        <dd>
          ${_.locatie ? `
            <a 
              href="https://www.google.com/maps/search/${encodeURIComponent(_.locatie)}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="contact-link"
              aria-label="Open locatie in Google Maps"
            >
              ${_.locatie}
            </a>
          ` : `<span class="error-message">Adres niet beschikbaar</span>`}
        </dd>
      </div>
      <div class="info-row">
        <dt>CONTACT</dt>
        <dd>
          ${_.telefoonummer ? `
            <a 
              href="tel:${_.telefoonummer}" 
              class="contact-link"
              aria-label="Bel naar ${_.telefoonummer}"
            >
              ${_.telefoonummer}
            </a>
          ` : `<span class="error-message">Telefoonnummer niet beschikbaar</span>`}
        </dd>
      </div>
      <div class="info-row">
        <dt>WEBSITE</dt>
        <dd>
          ${_.website ? `
            <a 
              href="${_.website}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="contact-link"
              aria-label="Bezoek ${_.name} website"
            >
              ${_.name.replace(/^https?:\/\//i, '').toUpperCase()}
            </a>
          ` : `<span class="error-message">Website niet beschikbaar</span>`}
        </dd>
      </div>
    </dl>
      
    <div class="opening-hours">
      <h2>OPENINGSTIJDEN</h2>
      <table>
        <tbody>
          <tr>
            <th>MAANDAG</th>
            <td>${_.maandag || '<span class="error-message">Niet beschikbaar</span>'}</td>
          </tr>
          <tr>
            <th>DINSDAG</th>
            <td>${_.dinsdag || '<span class="error-message">Niet beschikbaar</span>'}</td>
          </tr>
          <tr>
            <th>WOENSDAG</th>
            <td>${_.woensdag || '<span class="error-message">Niet beschikbaar</span>'}</td>
          </tr>
          <tr>
            <th>DONDERDAG</th>
            <td>${_.donderdag || '<span class="error-message">Niet beschikbaar</span>'}</td>
          </tr>
          <tr>
            <th>VRIJDAG</th>
            <td>${_.vrijdag || '<span class="error-message">Niet beschikbaar</span>'}</td>
          </tr>
          <tr>
            <th>ZATERDAG</th>
            <td>${_.zaterdag || '<span class="error-message">Niet beschikbaar</span>'}</td>
          </tr>
          <tr>
            <th>ZONDAG</th>
            <td>${_.zondag || '<span class="error-message">Niet beschikbaar</span>'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
    <button class="more-info-button button-base">Terug</button>
</div>
        `,
      };
}; 


//! popup interacties //
function setupPopupInteractions(_, c, a) {
  let e = _.getElement(),
    t = e.querySelector(".mapboxgl-popup-content"),
    l = e.querySelector(".popup-wrapper"),
    p = e.querySelector(".popup-front .content-wrapper"),
    o = e.querySelector(".popup-back .content-wrapper"),
    i = e.querySelector(".popup-description"),
    r = e.querySelector("#paint0_linear_3248_5");
  function s(_, c, a) {
    let e = parseFloat(a.y1.baseVal.value),
      t = parseFloat(a.y2.baseVal.value),
      l = Date.now();
    function p() {
      let o = Math.min((Date.now() - l) / 800, 1);
      (a.y1.baseVal.value = e + (_ - e) * o),
        (a.y2.baseVal.value = t + (c - t) * o),
        o < 1 && requestAnimationFrame(p);
    }
    requestAnimationFrame(p);
  }
  function x() {
    let _ = Math.max(p.offsetHeight, o.offsetHeight);
    (l.style.height = `${_}px`),
      e.querySelectorAll(".popup-side").forEach((c) => {
        c.style.height = `${_}px`;
      });
  }
  if (
    (l.addEventListener("mouseenter", () => {
      s(30, 282, r);
    }),
    l.addEventListener("mouseleave", () => {
      s(0, 252, r);
    }),
    setTimeout(x, 10),
    (t.style.opacity = "0"),
    (t.style.transform = "rotate(8deg) translateY(40px) scale(0.4)"),
    requestAnimationFrame(() => {
      (t.style.transition = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"),
        (t.style.opacity = "1"),
        (t.style.transform = "rotate(0deg) translateY(0) scale(1)");
    }),
    i)
  ) {
    i.addEventListener(
      "wheel",
      (_) => {
        _.stopPropagation(), _.preventDefault(), (i.scrollTop += _.deltaY);
      },
      { passive: !1 }
    ),
      i.addEventListener("mouseenter", () => {
        map.dragPan.disable(), map.scrollZoom.disable();
      }),
      i.addEventListener("mouseleave", () => {
        map.dragPan.enable(), map.scrollZoom.enable();
      });
    let n = !1,
      C,
      d;
    i.addEventListener("mousedown", (_) => {
      (n = !0),
        (C = _.pageY),
        (d = i.scrollTop),
        (i.style.cursor = "grabbing"),
        _.preventDefault(),
        _.stopPropagation();
    }),
      i.addEventListener("mousemove", (_) => {
        if (!n) return;
        _.preventDefault(), _.stopPropagation();
        let c = _.pageY - C;
        i.scrollTop = d - c;
      }),
      document.addEventListener("mouseup", () => {
        (n = !1), (i.style.cursor = "grab");
      }),
      i.addEventListener("mouseleave", () => {
        (n = !1), (i.style.cursor = "grab");
      });
    let u = 0,
      m = 0;
    i.addEventListener("touchstart", (_) => {
      (u = _.touches[0].clientY), (m = i.scrollTop), _.stopPropagation();
    }),
      i.addEventListener(
        "touchmove",
        (_) => {
          let c = u - _.touches[0].clientY;
          (i.scrollTop = m + c), _.stopPropagation(), _.preventDefault();
        },
        { passive: !1 }
      );
  }
  c.image &&
    e.querySelector(".impressie-button").addEventListener("click", () => {
      (t.style.transition = "all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)"),
        (t.style.transform = "rotate(-5deg) translateY(40px) scale(0.6)"),
        (t.style.opacity = "0"),
        setTimeout(() => {
          let e = Math.max(p.offsetHeight, o.offsetHeight);
          _.remove(), (activePopup = null), showImagePopup(c, a, e);
        }, 400);
    });
  e.querySelectorAll(".more-info-button").forEach((_) => {
    _.addEventListener("click", () => {
      l.classList.toggle("is-flipped");
    });
  });
  e.querySelectorAll(".close-button").forEach((c) => {
    c.addEventListener("click", () => {
      (t.style.transition = "all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)"),
        (t.style.transform = "rotate(-5deg) translateY(40px) scale(0.6)"),
        (t.style.opacity = "0"),
        setTimeout(() => {
          _.remove(), (activePopup = null);
        }, 400);
    });
  }),
    window.addEventListener("resize", x);
}
function showImagePopup(_, c, a) {
  let e = window.matchMedia("(max-width: 479px)").matches,
    t = new mapboxgl.Popup({
      offset: { bottom: [0, -5], top: [0, 0], left: [0, 0], right: [0, 0] },
      className: "custom-popup",
      closeButton: !1,
      maxWidth: "300px",
      closeOnClick: !1,
      anchor: "bottom",
    });
  map.flyTo({
    center: c,
    offset: e ? [0, 200] : [0, 250],
    duration: 1e3,
    essential: !0,
  });
  let l = `
    <style>
      .popup-wrapper {
        height: ${a}px;
      }

      .popup-side {
        background-color: ${_.color || "#6B46C1"};
        clip-path: polygon(calc(100% - 0px) 26.5px, calc(100% - 0px) calc(100% - 26.5px), calc(100% - 0px) calc(100% - 26.5px), calc(100% - 0.34671999999995px) calc(100% - 22.20048px), calc(100% - 1.3505599999999px) calc(100% - 18.12224px), calc(100% - 2.95704px) calc(100% - 14.31976px), calc(100% - 5.11168px) calc(100% - 10.84752px), calc(100% - 7.76px) calc(100% - 7.76px), calc(100% - 10.84752px) calc(100% - 5.11168px), calc(100% - 14.31976px) calc(100% - 2.9570399999999px), calc(100% - 18.12224px) calc(100% - 1.35056px), calc(100% - 22.20048px) calc(100% - 0.34672px), calc(100% - 26.5px) calc(100% - 0px), calc(50% - -32.6px) calc(100% - 0px), calc(50% - -32.6px) calc(100% - 0px), calc(50% - -31.57121px) calc(100% - 0.057139999999947px), calc(50% - -30.56648px) calc(100% - 0.2255199999999px), calc(50% - -29.59427px) calc(100% - 0.50057999999996px), calc(50% - -28.66304px) calc(100% - 0.87775999999991px), calc(50% - -27.78125px) calc(100% - 1.3525px), calc(50% - -26.95736px) calc(100% - 1.92024px), calc(50% - -26.19983px) calc(100% - 2.57642px), calc(50% - -25.51712px) calc(100% - 3.31648px), calc(50% - -24.91769px) calc(100% - 4.13586px), calc(50% - -24.41px) calc(100% - 5.03px), calc(50% - -24.41px) calc(100% - 5.03px), calc(50% - -22.95654px) calc(100% - 7.6045699999999px), calc(50% - -21.23752px) calc(100% - 9.9929599999998px), calc(50% - -19.27298px) calc(100% - 12.17519px), calc(50% - -17.08296px) calc(100% - 14.13128px), calc(50% - -14.6875px) calc(100% - 15.84125px), calc(50% - -12.10664px) calc(100% - 17.28512px), calc(50% - -9.36042px) calc(100% - 18.44291px), calc(50% - -6.46888px) calc(100% - 19.29464px), calc(50% - -3.45206px) calc(100% - 19.82033px), calc(50% - -0.32999999999998px) calc(100% - 20px), calc(50% - -0.32999999999998px) calc(100% - 20px), calc(50% - 2.79179px) calc(100% - 19.82033px), calc(50% - 5.8079199999999px) calc(100% - 19.29464px), calc(50% - 8.69853px) calc(100% - 18.44291px), calc(50% - 11.44376px) calc(100% - 17.28512px), calc(50% - 14.02375px) calc(100% - 15.84125px), calc(50% - 16.41864px) calc(100% - 14.13128px), calc(50% - 18.60857px) calc(100% - 12.17519px), calc(50% - 20.57368px) calc(100% - 9.9929599999999px), calc(50% - 22.29411px) calc(100% - 7.60457px), calc(50% - 23.75px) calc(100% - 5.03px), calc(50% - 23.75px) calc(100% - 5.03px), calc(50% - 24.25769px) calc(100% - 4.1358599999999px), calc(50% - 24.85712px) calc(100% - 3.3164799999998px), calc(50% - 25.53983px) calc(100% - 2.57642px), calc(50% - 26.29736px) calc(100% - 1.92024px), calc(50% - 27.12125px) calc(100% - 1.3525px), calc(50% - 28.00304px) calc(100% - 0.87775999999997px), calc(50% - 28.93427px) calc(100% - 0.50057999999996px), calc(50% - 29.90648px) calc(100% - 0.22552000000002px), calc(50% - 30.91121px) calc(100% - 0.057140000000004px), calc(50% - 31.94px) calc(100% - 0px), 26.5px calc(100% - 0px), 26.5px calc(100% - 0px), 22.20048px calc(100% - 0.34671999999989px), 18.12224px calc(100% - 1.3505599999999px), 14.31976px calc(100% - 2.95704px), 10.84752px calc(100% - 5.1116799999999px), 7.76px calc(100% - 7.76px), 5.11168px calc(100% - 10.84752px), 2.95704px calc(100% - 14.31976px), 1.35056px calc(100% - 18.12224px), 0.34672px calc(100% - 22.20048px), 4.3855735949631E-31px calc(100% - 26.5px), 0px 26.5px, 0px 26.5px, 0.34672px 22.20048px, 1.35056px 18.12224px, 2.95704px 14.31976px, 5.11168px 10.84752px, 7.76px 7.76px, 10.84752px 5.11168px, 14.31976px 2.95704px, 18.12224px 1.35056px, 22.20048px 0.34672px, 26.5px 4.3855735949631E-31px, calc(50% - 26.74px) 0px, calc(50% - 26.74px) 0px, calc(50% - 25.31263px) 0.07137px, calc(50% - 23.91544px) 0.28176px, calc(50% - 22.55581px) 0.62559px, calc(50% - 21.24112px) 1.09728px, calc(50% - 19.97875px) 1.69125px, calc(50% - 18.77608px) 2.40192px, calc(50% - 17.64049px) 3.22371px, calc(50% - 16.57936px) 4.15104px, calc(50% - 15.60007px) 5.17833px, calc(50% - 14.71px) 6.3px, calc(50% - 14.71px) 6.3px, calc(50% - 13.6371px) 7.64798px, calc(50% - 12.446px) 8.89024px, calc(50% - 11.1451px) 10.01826px, calc(50% - 9.7428px) 11.02352px, calc(50% - 8.2475px) 11.8975px, calc(50% - 6.6676px) 12.63168px, calc(50% - 5.0115px) 13.21754px, calc(50% - 3.2876px) 13.64656px, calc(50% - 1.5043px) 13.91022px, calc(50% - -0.32999999999996px) 14px, calc(50% - -0.32999999999998px) 14px, calc(50% - -2.16431px) 13.9105px, calc(50% - -3.94768px) 13.6476px, calc(50% - -5.67177px) 13.2197px, calc(50% - -7.32824px) 12.6352px, calc(50% - -8.90875px) 11.9025px, calc(50% - -10.40496px) 11.03px, calc(50% - -11.80853px) 10.0261px, calc(50% - -13.11112px) 8.8992px, calc(50% - -14.30439px) 7.6577px, calc(50% - -15.38px) 6.31px, calc(50% - -15.38px) 6.31px, calc(50% - -16.27279px) 5.18562px, calc(50% - -17.25432px) 4.15616px, calc(50% - -18.31733px) 3.22714px, calc(50% - -19.45456px) 2.40408px, calc(50% - -20.65875px) 1.6925px, calc(50% - -21.92264px) 1.09792px, calc(50% - -23.23897px) 0.62586px, calc(50% - -24.60048px) 0.28184px, calc(50% - -25.99991px) 0.07138px, calc(50% - -27.43px) 8.9116630386686E-32px, calc(100% - 26.5px) 0px, calc(100% - 26.5px) 0px, calc(100% - 22.20048px) 0.34672px, calc(100% - 18.12224px) 1.35056px, calc(100% - 14.31976px) 2.95704px, calc(100% - 10.84752px) 5.11168px, calc(100% - 7.76px) 7.76px, calc(100% - 5.11168px) 10.84752px, calc(100% - 2.9570399999999px) 14.31976px, calc(100% - 1.35056px) 18.12224px, calc(100% - 0.34671999999995px) 22.20048px, calc(100% - 5.6843418860808E-14px) 26.5px);
      }

      .close-button {
        background: ${_.color || "#6B46C1"};
      }
    </style>
  `;
  t
    .setLngLat(c)
    .setHTML(
      `
    ${l}
    <div class="popup-wrapper">
      <button class="close-button" aria-label="Close popup">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16.98 16.98" width="80%" height="80%">
          <path fill="currentColor" d="M16.46,13.98c.69.68.69,1.8,0,2.48-.34.35-.79.52-1.24.52s-.89-.17-1.24-.52l-5.49-5.49-5.49,5.49c-.68.69-1.79.69-2.48,0-.35-.34-.52-.79-.52-1.24s.17-.9.52-1.24l5.49-5.49L.52,3C-.17,2.32-.17,1.2.52.52c.35-.35.79-.52,1.24-.52s.9.17,1.24.52l5.49,5.49L13.98.52c.69-.69,1.8-.69,2.48,0,.35.34.52.79.52,1.24s-.17.9-.52,1.24l-5.49,5.49,5.49,5.49Z"/>
        </svg>
      </button>
      <div class="popup-side">
        <div class="image-container">
          <img src="${_.image}" alt="${_.name}" class="full-image">
          <div class="button-container">
            <button class="back-button">Terug</button>
          </div>
          <div class="location-name">${_.name}</div>
        </div>
      </div>
    </div>
  `
    )
    .addTo(map),
    (activePopup = t);
  let p = t.getElement(),
    o = p.querySelector(".mapboxgl-popup-content"),
    i = p.querySelector(".close-button"),
    r = p.querySelector(".back-button");
  (o.style.opacity = "0"),
    (o.style.transform = "rotate(8deg) translateY(40px) scale(0.4)"),
    requestAnimationFrame(() => {
      (o.style.transition = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"),
        (o.style.opacity = "1"),
        (o.style.transform = "rotate(0deg) translateY(0) scale(1)");
    }),
    i.addEventListener("click", () => {
      (o.style.transition = "all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)"),
        (o.style.transform = "rotate(-5deg) translateY(40px) scale(0.6)"),
        (o.style.opacity = "0"),
        setTimeout(() => {
          t.remove(), (activePopup = null);
        }, 400);
    }),
    r.addEventListener("click", () => {
      (o.style.transition = "all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)"),
        (o.style.transform = "rotate(-5deg) translateY(40px) scale(0.6)"),
        (o.style.opacity = "0"),
        setTimeout(() => {
          t.remove(), (activePopup = null);
          let a = new mapboxgl.Popup({
              offset: {
                bottom: [0, -5],
                top: [0, 0],
                left: [0, 0],
                right: [0, 0],
              },
              className: "custom-popup",
              closeButton: !1,
              maxWidth: "300px",
              closeOnClick: !1,
              anchor: "bottom",
            }),
            { styles: e, html: l } = createPopupContent(_);
          a.setLngLat(c).setHTML(`${e}${l}`),
            a.addTo(map),
            (activePopup = a),
            setupPopupInteractions(a, _, c);
          let p = a.getElement().querySelector(".mapboxgl-popup-content");
          (p.style.opacity = "0"),
            (p.style.transform = "rotate(8deg) translateY(40px) scale(0.4)"),
            requestAnimationFrame(() => {
              (p.style.transition =
                "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"),
                (p.style.opacity = "1"),
                (p.style.transform = "rotate(0deg) translateY(0) scale(1)");
            });
        }, 400);
    });
}

function closeItem() {
  $(".locations-map_item").removeClass("is--show");
}

function closeItemIfVisible() {
  $(".locations-map_item").hasClass("is--show") && closeItem();
}

// function createMapOverlay() {
//   let _ = document.createElement("div");
//   (_.className = "map-border-overlay"), document.body.appendChild(_);
// }

map.on("click", "location-markers", async (_) => {
  let c = _.features[0].geometry.coordinates.slice(),
    a = _.features[0].properties;
  isFlipped = !1;
  let e = window.matchMedia("(max-width: 479px)").matches ? [0, 200] : [0, 250];
  map.flyTo({ center: c, offset: e, duration: 1500, essential: !0 });
  let t = $(".locations-map_item.is--show");
  if (
    (t.length &&
      t.css({ opacity: "0", transform: "translateY(40px) scale(0.6)" }),
    activePopup)
  ) {
    let l = activePopup.getElement().querySelector(".mapboxgl-popup-content");
    (l.style.transition = "all 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)"),
      (l.style.transform = "rotate(-5deg) translateY(20px) scale(0.8)"),
      (l.style.opacity = "0");
  }
  await new Promise((_) => setTimeout(_, 400)),
    activePopup && (activePopup.remove(), (activePopup = null)),
    $(".locations-map_item")
      .removeClass("is--show")
      .css({
        display: "none",
        transform: "translateY(40px) scale(0.6)",
        opacity: "0",
      }),
    $(".locations-map_wrapper").addClass("is--show");
  let p = $(".locations-map_item").eq(a.arrayID);
  p.css({
    display: "block",
    opacity: "0",
    transform: "translateY(40px) scale(0.6)",
  }),
    p[0].offsetHeight,
    requestAnimationFrame(() => {
      p.css({
        transition: "all 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        opacity: "1",
        transform: "translateY(0) scale(1)",
      }).addClass("is--show");
    });
  let o = new mapboxgl.Popup({
    offset: { bottom: [0, -5], top: [0, 0], left: [0, 0], right: [0, 0] },
    className: "custom-popup",
    closeButton: !1,
    maxWidth: "300px",
    closeOnClick: !1,
    anchor: "bottom",
  });
  window.geolocationManager && (window.geolocationManager.isPopupOpen = !0);
  let { styles: i, html: r } = createPopupContent(a);
  o.setLngLat(c).setHTML(`${i}${r}`).addTo(map),
    (activePopup = o),
    o.on("close", () => {
      window.geolocationManager && (window.geolocationManager.isPopupOpen = !1);
    }),
    setupPopupInteractions(o, a, c);
}),
  map.on("load", () => {
    loadIcons(),
      addCustomMarkers(),
      setupLocationFilters(),
      // createMapOverlay(),
      setTimeout(() => {
        let _ = window.matchMedia("(max-width: 479px)").matches ? 17 : 18;
        map.jumpTo({
          center: [5.979642, 50.887634],
          zoom: 15,
          pitch: 0,
          bearing: 0,
        }),
          map.flyTo({
            center: [5.979642, 50.887634],
            zoom: _,
            pitch: 55,
            bearing: -17.6,
            duration: 6e3,
            essential: !0,
            easing: function (_) {
              return _ * (2 - _);
            },
          });
      }, 5e3);
  }),
  $(".close-block").on("click", () => {
    closeItem();
  }),
  ["dragstart", "zoomstart", "rotatestart", "pitchstart"].forEach((_) => {
    map.on(_, () => {
      let _ = $(".locations-map_item.is--show");
      if (
        (_.length &&
          (_.css({
            opacity: "0",
            transform: "translateY(40px) scale(0.6)",
            transition: "all 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)",
          }),
          setTimeout(() => {
            _.removeClass("is--show");
          }, 400)),
        activePopup)
      ) {
        let c = activePopup
          .getElement()
          .querySelector(".mapboxgl-popup-content");
        (c.style.transition =
          "all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)"),
          (c.style.transform = "rotate(-5deg) translateY(40px) scale(0.6)"),
          (c.style.opacity = "0"),
          setTimeout(() => {
            activePopup.remove(), (activePopup = null);
          }, 400);
      }
    });
  });


//! 3D Model configuraties
const modelConfigs = [
  {
      id: 'schunck',
      origin: [50.88778235149691, 5.979389928151281],
      altitude: 0,
      rotate: [Math.PI / 2, 0.45, 0],
      url: 'https://cdn.jsdelivr.net/gh/Artwalters/3dmodels_heerlen@main/schunckv5.glb',
      scale: 1.3
  },
  {
      id: 'theater',
      origin: [50.886541206107225, 5.972454838314243],
      altitude: 0,
      rotate: [Math.PI / 2, 2.05, 0],
      url: 'https://cdn.jsdelivr.net/gh/Artwalters/3dmodels_heerlen@main/theaterheerlenv4.glb',
      scale: 0.6
  }
];

//! Image plane configuraties
const imagePlaneConfigs = [
  {
      id: 'image1',
      origin: [50.88801513786042, 5.980644311376565],
      altitude: 6.5,
      rotate: [Math.PI / 2, 0.35, 0],
      imageUrl: 'data:image/png;base64,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',
      width: 13,  // Gewenste breedte in meters
      height: 13  // Gewenste hoogte in meters
  }
];

const ZOOM_MAX = 15.5;
const ZOOM_MIN = 14.5;
const MAX_HEIGHT_OFFSET = 100;

// Bereken transformaties voor 3D modellen
const modelTransforms = modelConfigs.map(config => {
  const mercatorCoord = mapboxgl.MercatorCoordinate.fromLngLat(
      [config.origin[1], config.origin[0]],
      config.altitude
  );
  return {
      id: config.id,
      url: config.url,
      translateX: mercatorCoord.x,
      translateY: mercatorCoord.y,
      translateZ: mercatorCoord.z,
      rotateX: config.rotate[0],
      rotateY: config.rotate[1],
      rotateZ: config.rotate[2],
      scale: mercatorCoord.meterInMercatorCoordinateUnits() * (config.scale || 1),
      baseHeight: mercatorCoord.z
  };
});

// Nieuwe helper functie voor image planes
function createImagePlane(config) {
  // Converteer de opgegeven origin naar Mercator coördinaten
  const mercatorCoord = mapboxgl.MercatorCoordinate.fromLngLat(
    [config.origin[1], config.origin[0]],
    config.altitude
  );
  // Bepaal de schaalfactor: meters naar Mercator-eenheden
  const meterScale = mercatorCoord.meterInMercatorCoordinateUnits();
  // Bereken de gewenste breedte en hoogte in Mercator-eenheden
  const geoWidth = config.width * meterScale;
  const geoHeight = config.height * meterScale;

  return new Promise((resolve, reject) => {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      config.imageUrl,
      (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide
        });
        // Maak een plane-geometrie met de juiste afmetingen
        const geometry = new THREE.PlaneGeometry(geoWidth, geoHeight);
        const plane = new THREE.Mesh(geometry, material);

        // Sla de transformatie-informatie op in userData
        plane.userData.transform = {
          translateX: mercatorCoord.x,
          translateY: mercatorCoord.y,
          translateZ: mercatorCoord.z,
          rotateX: config.rotate[0],
          rotateY: config.rotate[1],
          rotateZ: config.rotate[2],
          baseHeight: mercatorCoord.z
        };

        // Geef aan dat dit een image plane is (voor aangepaste afhandeling in de render-loop)
        plane.userData.isImagePlane = true;
        resolve(plane);
      },
      undefined,
      (error) => reject(error)
    );
  });
}

// Custom layer voor Mapbox
const customLayer = {
  id: '3d-models',
  type: 'custom',
  renderingMode: '3d',

  onAdd: function(map, gl) {
    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    const azimuth = 210 * (Math.PI / 180);
    const polar = 30 * (Math.PI / 180);
    directionalLight.position.set(
      Math.sin(azimuth) * Math.sin(polar),
      Math.cos(azimuth) * Math.sin(polar),
      Math.cos(polar)
    ).normalize();
    this.scene.add(directionalLight);

    // Laad 3D modellen
    const loader = new THREE.GLTFLoader();
    modelTransforms.forEach(transform => {
      loader.load(
        transform.url,
        (gltf) => {
          gltf.scene.traverse(child => {
            if (child.isMesh) {
              child.frustumCulled = true;
              child.material.precision = 'highp';
              if (child.material.map) {
                child.material.map.anisotropy = 4;
                child.material.map.minFilter = THREE.LinearMipMapLinearFilter;
              }
            }
          });
          gltf.scene.userData.transform = transform;
          this.scene.add(gltf.scene);
        },
        undefined,
        (error) => {
          console.error(`Error loading model ${transform.id}:`, error);
        }
      );
    });

    // Laad image planes met de nieuwe aanpak
    imagePlaneConfigs.forEach(config => {
      createImagePlane(config)
        .then(plane => {
          this.scene.add(plane);
        })
        .catch(error => {
          console.error(`Error loading image plane ${config.id}:`, error);
        });
    });

    this.map = map;
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.autoClear = false;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  },

  render: function(gl, matrix) {
    const m = new THREE.Matrix4().fromArray(matrix);
    const currentZoom = this.map.getZoom();

    let heightFactor = 1;
    if (currentZoom <= ZOOM_MIN) {
      heightFactor = 0;
    } else if (currentZoom >= ZOOM_MAX) {
      heightFactor = 1;
    } else {
      heightFactor = (currentZoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN);
    }

    this.scene.children.forEach(child => {
      if (child.userData.transform) {
        const transform = child.userData.transform;
        // Pas de hoogte aan voor een dynamisch effect
        const currentHeight = transform.baseHeight - ((1 - heightFactor) * MAX_HEIGHT_OFFSET);

        // Maak de rotatie matrices
        const rotationX = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(1, 0, 0),
          transform.rotateX
        );
        const rotationY = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 1, 0),
          transform.rotateY
        );
        const rotationZ = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 0, 1),
          transform.rotateZ
        );

        let scaleX, scaleY, scaleZ;
        if (child.userData.isImagePlane) {
          // Omdat de geometry al de juiste afmetingen heeft, hoeven we voor image planes niet extra te schalen in x en y
          scaleX = 1;
          scaleY = 1;
          // Voor een fade-effect kunnen we wel de z-schaal (of transparantie) aanpassen
          scaleZ = heightFactor;
        } else {
          scaleX = transform.scale;
          scaleY = transform.scale;
          scaleZ = transform.scale * heightFactor;
        }

        const l = new THREE.Matrix4()
          .makeTranslation(transform.translateX, transform.translateY, currentHeight)
          .scale(new THREE.Vector3(scaleX, -scaleY, scaleZ))
          .multiply(rotationX)
          .multiply(rotationY)
          .multiply(rotationZ);

        child.matrix = m.clone().multiply(l);
        child.matrixAutoUpdate = false;

        // Update de opacity voor een fade-effect
        if (child.material) {
          child.material.opacity = heightFactor;
          child.material.transparent = true;
        } else if (child.traverse) {
          child.traverse(object => {
            if (object.material) {
              object.material.opacity = heightFactor;
              object.material.transparent = true;
            }
          });
        }
      }
    });

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.map.triggerRepaint();
  }
};

map.on('style.load', () => {
  map.addLayer(customLayer);
});

