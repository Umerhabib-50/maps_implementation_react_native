import React, {useState, useEffect} from 'react';
import {
  View,
  PermissionsAndroid,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Text,
} from 'react-native';
import MapView, {Marker, Polyline} from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';

const App = () => {
  const [travelTime, setTravelTime] = useState('');
  const [travelDistance, setTravelDistance] = useState('');

  const [markerCoordinate, setMarkerCoordinate] = useState({
    latitude: 31.5204,
    longitude: 74.3587,
  });

  const [mapRegion, setMapRegion] = useState({
    latitude: 31.5204,
    longitude: 74.3587,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [destinationCoordinate, setDestinationCoordinate] = useState(null);
  const [directions, setDirections] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  console.log('searchResults', searchResults);

  useEffect(() => {
    // Check and request location permissions when the component mounts
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        Geolocation.getCurrentPosition(
          position => {
            const newCoordinate = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setMarkerCoordinate(newCoordinate);
            setMapRegion({
              ...newCoordinate,
              latitudeDelta: 0.0122,
              longitudeDelta: 0.0121,
            });
          },
          error => {
            console.error(error.code, error.message);
          },
          {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
        );
        console.log('Location permission granted');
      } else {
        console.log('Location permission denied');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const searchLocation = async searchQuery => {
    setSearchQuery(searchQuery);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          searchQuery,
        )}&key=AIzaSyC7RXgh-QRRXJJFROGgFb5eoCB3E2o3JBI`,
      );

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
        console.error('No results found');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectLocation = location => {
    // You can use the selected location's coordinates for routing
    const selectedCoordinate = {
      latitude: location.geometry.location.lat,
      longitude: location.geometry.location.lng,
    };

    // Calculate directions to the selected location
    calculateDirections(markerCoordinate, selectedCoordinate);

    // Set the selected location as the destination
    setDestinationCoordinate(selectedCoordinate);

    // Clear the search results and query
    setSearchResults([]);
    setSearchQuery('');
  };

  const calculateDirections = async (origin, destination) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=AIzaSyC7RXgh-QRRXJJFROGgFb5eoCB3E2o3JBI`,
      );

      if (!response.ok) {
        throw new Error('Directions request failed');
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const polyline = route.overview_polyline.points;
        setDirections(polyline);
        setTravelTime(route.legs[0].duration.text); // Get estimated travel time
        setTravelDistance(route.legs[0].distance.text); // Get estimated travel distance
      } else {
        console.error('No directions found');
      }
    } catch (error) {
      console.error(error);
    }
  };

  function decodePolyline(encoded) {
    let index = 0;
    const len = encoded.length;
    const points = [];
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      const point = {
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      };

      points.push(point);
    }

    return points;
  }

  return (
    <View style={{flex: 1}}>
      <Button
        onPress={() => {
          // You can use mapRegion as the origin for routing
          const origin = {
            latitude: mapRegion.latitude,
            longitude: mapRegion.longitude,
          };

          const destination = {
            latitude: 31.4691,
            longitude: 74.3939,
          };

          calculateDirections(origin, destination);
          setDestinationCoordinate(destination);
        }}
        title="Learn More"
      />
      <TextInput
        onChangeText={searchLocation}
        value={searchQuery}
        placeholder="Search for a location"
      />
      <FlatList
        data={searchResults}
        renderItem={({item}) => {
          return (
            <TouchableOpacity onPress={() => handleSelectLocation(item)}>
              <View>
                <Text>{item.name}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        keyExtractor={item => item.id}
      />
      <Text>Estimated Travel Time: {travelTime}</Text>
      <Text>Estimated Travel Distance: {travelDistance}</Text>
      <MapView style={{flex: 1}} initialRegion={mapRegion} region={mapRegion}>
        <Marker draggable coordinate={markerCoordinate} />
        {destinationCoordinate && (
          <Marker coordinate={destinationCoordinate} pinColor="blue" />
        )}

        {directions.length > 0 && (
          <Polyline
            coordinates={decodePolyline(directions)}
            strokeColor="#000"
            strokeWidth={6}
          />
        )}
      </MapView>
    </View>
  );
};

export default App;
