// Static require() map — OBJ mesh + PNG texture pairs.
export const OBJ_MAP = {
  'assets/models/characters/chicken/0.obj': require('../../assets/models/characters/chicken/0.obj'),
  'assets/models/characters/palmer/palmer.obj': require('../../assets/models/characters/palmer/palmer.obj'),
  'assets/models/characters/juwan/juwan.obj': require('../../assets/models/characters/juwan/juwan.obj'),
  'assets/models/characters/wheeler/wheeler.obj': require('../../assets/models/characters/wheeler/wheeler.obj'),
  'assets/models/characters/avocoder/avocoder.obj': require('../../assets/models/characters/avocoder/avocoder.obj'),
  'assets/models/characters/bacon/bacon.obj': require('../../assets/models/characters/bacon/bacon.obj'),
  'assets/models/characters/brent/0.obj': require('../../assets/models/characters/brent/0.obj'),

  'assets/models/environment/grass/model.obj': require('../../assets/models/environment/grass/model.obj'),
  'assets/models/environment/road/model.obj': require('../../assets/models/environment/road/model.obj'),
  'assets/models/environment/river/0.obj': require('../../assets/models/environment/river/0.obj'),

  'assets/models/environment/tree/0/0.obj': require('../../assets/models/environment/tree/0/0.obj'),
  'assets/models/environment/tree/1/0.obj': require('../../assets/models/environment/tree/1/0.obj'),
  'assets/models/environment/tree/2/0.obj': require('../../assets/models/environment/tree/2/0.obj'),
  'assets/models/environment/tree/3/0.obj': require('../../assets/models/environment/tree/3/0.obj'),

  'assets/models/environment/log/0/0.obj': require('../../assets/models/environment/log/0/0.obj'),
  'assets/models/environment/log/1/0.obj': require('../../assets/models/environment/log/1/0.obj'),
  'assets/models/environment/log/2/0.obj': require('../../assets/models/environment/log/2/0.obj'),
  'assets/models/environment/log/3/0.obj': require('../../assets/models/environment/log/3/0.obj'),

  'assets/models/vehicles/blue_car/0.obj': require('../../assets/models/vehicles/blue_car/0.obj'),
  'assets/models/vehicles/green_car/0.obj': require('../../assets/models/vehicles/green_car/0.obj'),
  'assets/models/vehicles/purple_car/0.obj': require('../../assets/models/vehicles/purple_car/0.obj'),
  'assets/models/vehicles/orange_car/0.obj': require('../../assets/models/vehicles/orange_car/0.obj'),
  'assets/models/vehicles/taxi/0.obj': require('../../assets/models/vehicles/taxi/0.obj'),
  'assets/models/vehicles/red_truck/0.obj': require('../../assets/models/vehicles/red_truck/0.obj'),
  'assets/models/vehicles/blue_truck/0.obj': require('../../assets/models/vehicles/blue_truck/0.obj'),
};

// Parallel path-only map for release (nitro-fs asset://crossy/<path>).
// Same keys as TEX_MAP below; value is the relative path inside the bundle.
export const TEX_PATH_MAP = {
  'assets/models/characters/chicken/0.obj': 'assets/models/characters/chicken/0.png',
  'assets/models/characters/palmer/palmer.obj': 'assets/models/characters/palmer/palmer.png',
  'assets/models/characters/juwan/juwan.obj': 'assets/models/characters/juwan/juwan.png',
  'assets/models/characters/wheeler/wheeler.obj': 'assets/models/characters/wheeler/wheeler.png',
  'assets/models/characters/avocoder/avocoder.obj': 'assets/models/characters/avocoder/avocoder.png',
  'assets/models/characters/bacon/bacon.obj': 'assets/models/characters/bacon/bacon.png',
  'assets/models/characters/brent/0.obj': 'assets/models/characters/brent/0.png',
  'assets/models/environment/grass/model.obj': 'assets/models/environment/grass/light-grass.png',
  'assets/models/environment/road/model.obj': 'assets/models/environment/road/stripes-texture.png',
  'assets/models/environment/river/0.obj': 'assets/models/environment/river/0.png',
  'assets/models/environment/tree/0/0.obj': 'assets/models/environment/tree/0/0.png',
  'assets/models/environment/tree/1/0.obj': 'assets/models/environment/tree/1/0.png',
  'assets/models/environment/tree/2/0.obj': 'assets/models/environment/tree/2/0.png',
  'assets/models/environment/tree/3/0.obj': 'assets/models/environment/tree/3/0.png',
  'assets/models/environment/log/0/0.obj': 'assets/models/environment/log/0/0.png',
  'assets/models/environment/log/1/0.obj': 'assets/models/environment/log/1/0.png',
  'assets/models/environment/log/2/0.obj': 'assets/models/environment/log/2/0.png',
  'assets/models/environment/log/3/0.obj': 'assets/models/environment/log/3/0.png',
  'assets/models/vehicles/blue_car/0.obj': 'assets/models/vehicles/blue_car/0.png',
  'assets/models/vehicles/green_car/0.obj': 'assets/models/vehicles/green_car/0.png',
  'assets/models/vehicles/purple_car/0.obj': 'assets/models/vehicles/purple_car/0.png',
  'assets/models/vehicles/orange_car/0.obj': 'assets/models/vehicles/orange_car/0.png',
  'assets/models/vehicles/taxi/0.obj': 'assets/models/vehicles/taxi/0.png',
  'assets/models/vehicles/red_truck/0.obj': 'assets/models/vehicles/red_truck/0.png',
  'assets/models/vehicles/blue_truck/0.obj': 'assets/models/vehicles/blue_truck/0.png',
};

// PNG texture per OBJ path.
export const TEX_MAP = {
  'assets/models/characters/chicken/0.obj': require('../../assets/models/characters/chicken/0.png'),
  'assets/models/characters/palmer/palmer.obj': require('../../assets/models/characters/palmer/palmer.png'),
  'assets/models/characters/juwan/juwan.obj': require('../../assets/models/characters/juwan/juwan.png'),
  'assets/models/characters/wheeler/wheeler.obj': require('../../assets/models/characters/wheeler/wheeler.png'),
  'assets/models/characters/avocoder/avocoder.obj': require('../../assets/models/characters/avocoder/avocoder.png'),
  'assets/models/characters/bacon/bacon.obj': require('../../assets/models/characters/bacon/bacon.png'),
  'assets/models/characters/brent/0.obj': require('../../assets/models/characters/brent/0.png'),

  'assets/models/environment/grass/model.obj': require('../../assets/models/environment/grass/light-grass.png'),
  'assets/models/environment/road/model.obj': require('../../assets/models/environment/road/stripes-texture.png'),
  'assets/models/environment/river/0.obj': require('../../assets/models/environment/river/0.png'),

  'assets/models/environment/tree/0/0.obj': require('../../assets/models/environment/tree/0/0.png'),
  'assets/models/environment/tree/1/0.obj': require('../../assets/models/environment/tree/1/0.png'),
  'assets/models/environment/tree/2/0.obj': require('../../assets/models/environment/tree/2/0.png'),
  'assets/models/environment/tree/3/0.obj': require('../../assets/models/environment/tree/3/0.png'),

  'assets/models/environment/log/0/0.obj': require('../../assets/models/environment/log/0/0.png'),
  'assets/models/environment/log/1/0.obj': require('../../assets/models/environment/log/1/0.png'),
  'assets/models/environment/log/2/0.obj': require('../../assets/models/environment/log/2/0.png'),
  'assets/models/environment/log/3/0.obj': require('../../assets/models/environment/log/3/0.png'),

  'assets/models/vehicles/blue_car/0.obj': require('../../assets/models/vehicles/blue_car/0.png'),
  'assets/models/vehicles/green_car/0.obj': require('../../assets/models/vehicles/green_car/0.png'),
  'assets/models/vehicles/purple_car/0.obj': require('../../assets/models/vehicles/purple_car/0.png'),
  'assets/models/vehicles/orange_car/0.obj': require('../../assets/models/vehicles/orange_car/0.png'),
  'assets/models/vehicles/taxi/0.obj': require('../../assets/models/vehicles/taxi/0.png'),
  'assets/models/vehicles/red_truck/0.obj': require('../../assets/models/vehicles/red_truck/0.png'),
  'assets/models/vehicles/blue_truck/0.obj': require('../../assets/models/vehicles/blue_truck/0.png'),
};
