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

