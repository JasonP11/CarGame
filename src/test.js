/* // ✅ Function to run every frame
export function updateWheelFriction(vehicle) {
    vehicle.wheelInfos.forEach((wheel, i) => {
        if (wheel.raycastResult && wheel.raycastResult.body) {
            const mat = wheel.raycastResult.body.material;

            if (mat) {
                console.log(`Wheel ${i} touching material: ${mat.name}`);
            } else {
                console.log(`Wheel ${i} touching body with NO material`);
            }

            if (mat && mat.name === "ice") {
                wheel.frictionSlip = 0.5;   // ❄️ slippery
            } else {
                wheel.frictionSlip = 5.0;   // 🛣️ normal grip
            }
        } else {
            console.log(`Wheel ${i} not touching anything`);
        }
    });
}
 */

import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function loadTrackBorder(scene, world) {
     console.log("✅ GLTF loaded callback fired!");
  const loader = new GLTFLoader();

loader.load(
  "https://raw.githubusercontent.com/JackAlt3/CarGame/main/border.glb",
  (gltf) => {
    const borderObj = gltf.scene;
    scene.add(borderObj);

    console.log("GLTF loaded:", borderObj);

    borderObj.traverse((child) => {
      console.log("Child:", child.type, child.name);

      // Check if it has geometry at all
      if (child.geometry) {
        const geo = child.geometry;
        if (geo.attributes && geo.attributes.position) {
          const pos = geo.attributes.position.array;
          console.log(`Geometry on ${child.type} (${child.name}), vertex count: ${pos.length / 3}`);

          for (let i = 0; i < pos.length; i += 3) {
            const x = pos[i];
            const y = pos[i + 1];
            const z = pos[i + 2];
            console.log(`Vertex ${i / 3}: x=${x}, y=${y}, z=${z}`);
          }
        } else {
          console.warn(`No position attribute found on ${child.type} (${child.name})`);
        }
      }
    });
  },
  undefined,
  (err) => console.error("Error loading border GLB:", err)
);

}
