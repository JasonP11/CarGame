import * as THREE from 'three';


export function syncVehicleModel(vehicleData, visualOffset = new THREE.Vector3(0, -0.6, 0)) {
    if (!vehicleData || !vehicleData.model || !vehicleData.chassisBody) return;

    const offset = visualOffset.clone().applyQuaternion(vehicleData.chassisBody.quaternion);
    vehicleData.model.position.copy(vehicleData.chassisBody.position).add(offset);
    vehicleData.model.quaternion.copy(vehicleData.chassisBody.quaternion);

    if (vehicleData.vehicle && vehicleData.wheelMeshes) {
        for (let i = 0; i < vehicleData.vehicle.wheelInfos.length; i++) {
            vehicleData.vehicle.updateWheelTransform(i);
            if (vehicleData.wheelMeshes[i]) {
                const t = vehicleData.vehicle.wheelInfos[i].worldTransform;
                vehicleData.wheelMeshes[i].position.copy(t.position);
                vehicleData.wheelMeshes[i].quaternion.copy(t.quaternion);
            }
        }
    }
}