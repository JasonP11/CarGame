import * as CANNON from 'cannon-es';
import * as THREE from 'three';        // (only if you use THREE in this file)

export function worldborder(world) {
  // helper to make one wall
  function wall(width, height, thickness, pos, rot) {
    const halfExtents = new CANNON.Vec3(width/2, height/2, thickness/2);
    const shape = new CANNON.Box(halfExtents);

    const body = new CANNON.Body({
      mass: 0,
      shape,
      material: world.wallMaterial,
    });

    body.position.set(pos.x, pos.y, pos.z);
    body.quaternion.setFromEuler(rot.x, rot.y, rot.z);
    world.addBody(body);

    return body;
  }

  // now create all borders in one place
  wall(20, 15, 0, {x: -115, y: 7.5, z: -95}, {x: 0, y: Math.PI/2, z: 0});
  wall(20, 15, 0, {x: -108.8, y: 7.5, z: -139.2}, {x: 0, y: 1.2707963267948963, z: 0});
  wall(20, 15, 0, {x: -101,   y: 7.5, z:  -159.6999}, {x: 0, y: 1.1507963267948962, z: 0});
  wall(20, 15, 0, {x: -90.8,   y: 7.5, z:  -180.49999}, {x: 0, y: 7.370796326794931, z: 0});
  wall(20, 15, 0, {x:-79.05, y: 7.5, z: -197.7499999 }, {x: 0, y: 4.03079632679488, z: 0});
  wall(20, 15, 0, {x:-65.0000, y: 7.5, z: -211.99999 }, {x: 0, y: 3.8207963267948837, z: 0});
  wall(20, 15, 0, {x:-47.30000, y: 7.5, z: -223.9499999}, {x: 0, y: 6.7707963267948985, z: 0});
  wall(20, 15, 0, {x:-28.5500, y: 7.5, z: -231.79999}, {x: 0, y: 0.3107963267948953, z: 0});
  wall(20, 15, 0, {x:-7.4500, y:7.5, z:-236.1500}, {x:0.0000, y:0.0907963267949, z:0.0000});
  wall(20, 15, 0, {x:13.8000, y: 7.5, z:-236.0500}, {x:0.0000, y:6.1907963267949, z:0.0000});
  wall(20, 15, 0, {x:34.2500, y: 7.5, z:-232.1000}, {x:0.0000, y:-0.2892036732051, z:0.0000});
  wall(20, 15, 0, {x:54.0500, y: 7.5, z:-223.9500}, {x:0.0000, y:-0.4792036732051, z:0.0000});
  wall(20, 15, 0, {x:71.0500, y: 7.5, z:-212.6000}, {x:0.0000, y:-0.6792036732051, z:0.0000});
  wall(20, 15, 0, {x:85.8500, y: 7.5, z:-197.7500}, {x:0.0000, y:-0.8792036732051, z:0.0000});
  wall(20, 15, 0, {x:97.3000, y: 7.5, z:-179.5500}, {x:0.0000, y:-1.1492036732051, z:0.0000});
  wall(20, 15, 0, {x:97.3000, y: 7.5, z:-179.5500}, {x:0.0000, y:-1.1492036732051, z:0.0000});
//   wall(100, 20, 1, {x:  50, y: 10, z: 0 }, {x: 0, y: Math.PI/2, z: 0});
}
