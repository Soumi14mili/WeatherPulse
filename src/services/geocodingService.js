const BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export const searchCities = async (name, count = 8) => {
    const params = new URLSearchParams({
        name,
        count,
        language: 'en',
        format: 'json'
    });
    
    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Failed to fetch geocoding data');
    }
    const data = await response.json();
    if (!data.results) return [];
    
    return data.results.map(city => ({
        name: city.name,
        country: city.country,
        admin1: city.admin1,
        latitude: city.latitude,
        longitude: city.longitude,
        country_code: city.country_code
    }));
};

export const reverseGeocode = async (lat, lng) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {
        headers: {
            'Accept-Language': 'en'
        }
    });
    if (!response.ok) {
        throw new Error('Failed to fetch reverse geocoding data');
    }
    const data = await response.json();
    const address = data.address || {};
    
    // Find the most appropriate local name
    const name = address.city || 
                 address.town || 
                 address.city_district || 
                 address.suburb || 
                 address.village || 
                 address.municipality || 
                 address.county || 
                 address.state || 
                 'Selected Location';
                 
    return {
        name,
        country: address.country || '',
        admin1: address.state || '',
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        country_code: address.country_code ? address.country_code.toUpperCase() : ''
    };
};
