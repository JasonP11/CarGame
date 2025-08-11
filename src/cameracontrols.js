import * as THREE from 'three';


// Exported function to sync the camera with the vehicle
export function syncVehicleCamera(player, camera, controls, cameraOffset, isUserInteracting, isUserZooming) {
    const lerpFactor = 0.1;
    const maxSpeed = 0.5;

    // Static variable-like behaviour for smooth speed
    if (!player._smoothSpeed) player._smoothSpeed = 0;

    // Position of vehicle
    const bodyPos = new THREE.Vector3().copy(player.chassisBody.position);
    const desiredCameraPos = bodyPos.clone().add(
        cameraOffset.clone().applyQuaternion(player.chassisBody.quaternion)
    );

    // Calculate smoothed speed
    const currentSpeed = player.chassisBody.velocity.length();
    const smoothing = 0.02;
    player._smoothSpeed += (currentSpeed - player._smoothSpeed) * smoothing;

    // Adjust lerp factor based on speed
    const speedFactor = Math.min(player._smoothSpeed / maxSpeed, 1);
    const lerpAtSpeed = THREE.MathUtils.lerp(lerpFactor, 1, speedFactor);

    // Move camera if user is not interacting
    if (!isUserInteracting && !isUserZooming) {
        camera.position.lerp(desiredCameraPos, lerpAtSpeed);
        controls.target.lerp(bodyPos, lerpFactor);
        camera.lookAt(bodyPos);
    } else {
        controls.update();
    }
}


        const lerpFactor = 0.1;
        const maxSpeed = 0.5;
        // const cameraOffset = new THREE.Vector3(0, 2, 5);
        const bodyPos = new THREE.Vector3().copy(player.chassisBody.position);
        const desiredCameraPos = bodyPos.clone().add(cameraOffset.clone().applyQuaternion(player.chassisBody.quaternion));

        const currentSpeed = player.chassisBody.velocity.length();
        const smoothing = 0.02;
        smoothSpeed += (currentSpeed - smoothSpeed) * smoothing;

        const speedFactor = Math.min(smoothSpeed / maxSpeed, 1);
        const lerpAtSpeed = THREE.MathUtils.lerp(lerpFactor, 1, speedFactor);

        if (!isUserInteracting && !isUserZooming) {
            camera.position.lerp(desiredCameraPos, lerpAtSpeed);
            controls.target.lerp(bodyPos, lerpFactor);
            camera.lookAt(bodyPos);
        } else {
            controls.update();
        }