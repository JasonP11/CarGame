import * as CANNON from 'cannon-es';
import * as THREE from 'three';        // (only if you use THREE in this file)

export function createVehicleAt(scene, world, x, y, z, gltfLoader, wheelGLBUrl = 'https://raw.githubusercontent.com/JackAlt3/CarGame/main/wheels.glb') {
    const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.3, 2));
    const chassisBody = new CANNON.Body({ mass: 150 });
    chassisBody.addShape(chassisShape);
    chassisBody.position.set(x, y, z);
    chassisBody.angularDamping = 0.5;
    world.addBody(chassisBody);

    const vehicle = new CANNON.RaycastVehicle({
        chassisBody,
        indexRightAxis: 0,
        indexUpAxis: 1,
        indexForwardAxis: 2,
    });

    const wheelMeshes = [];
    const wheelOptions = {
        radius: 0.35,
        directionLocal: new CANNON.Vec3(0, -1, 0),
        suspensionStiffness: 30,
        suspensionRestLength: 0.3,
        frictionSlip: 5,
        dampingRelaxation: 2.3,
        dampingCompression: 4.4,
        maxSuspensionForce: 100000,
        rollInfluence: 0.01,
        axleLocal: new CANNON.Vec3(-1, 0, 0),
        maxSuspensionTravel: 0.3,
        customSlidingRotationalSpeed: -30,
        useCustomSlidingRotationalSpeed: true,
    };

    const wheelPositions = [
        new CANNON.Vec3(-0.858, 0, 1.75),
        new CANNON.Vec3(0.76, 0, 1.78),
        new CANNON.Vec3(-0.858, 0, -1.15),
        new CANNON.Vec3(0.76, 0, -1.15),
    ];

    wheelPositions.forEach(pos => {
        vehicle.addWheel({
            ...wheelOptions,
            chassisConnectionPointLocal: pos.clone()
        });
    });

    vehicle.addToWorld(world);

    vehicle.wheelInfos.forEach((wheel, index) => {
        gltfLoader.load(wheelGLBUrl, gltf => {
            const model = gltf.scene;
            model.scale.set(1, 1, 1);
            model.rotation.x = Math.PI / 2;

            if (wheel.chassisConnectionPointLocal.x > 0) {
                model.scale.x *= -1;
            }

            const wrapper = new THREE.Object3D();
            wrapper.add(model);
            scene.add(wrapper);
            wheelMeshes[index] = wrapper;
        });
    });

    return {
        vehicle,
        chassisBody,
        wheelMeshes,
        // chassisWire
    };
}