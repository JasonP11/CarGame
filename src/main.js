import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import CannonDebugger from 'cannon-es-debugger';
import * as CANNON from 'cannon-es';
import Stats from 'stats.js';
import { io } from 'socket.io-client';
import { createVehicleAt } from './vehicle.js';
import { syncVehicleModel } from './vehiclesync.js';
// import { updateWheelFriction } from './test.js';


console.log('CANNON loaded:', CANNON); // should show full object
const scene = new THREE.Scene();
const socket = io(); 
// const socket = io('http://localhost:3000'); 
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Earth gravity


const cannonDebugger = CannonDebugger(scene, world, {
color: 0x00ff00,
});

// Simulated environment reflection using CubeTexture with solid colors
const loader = new THREE.CubeTextureLoader();
const envMap = loader.load([
  'https://threejs.org/examples/textures/cube/Bridge2/posx.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/negx.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/posy.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/negy.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/posz.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/negz.jpg'
]);
envMap.mapping = THREE.CubeReflectionMapping;
scene.environment = envMap;
scene.background = envMap;

    const camera = new THREE.PerspectiveCamera(
        75, window.innerWidth / window.innerHeight, 0.1, 1000
    );


    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // const controls = new THREE.OrbitControls(camera, renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // for smooth damping (inertia)
    controls.dampingFactor = 0.05;

    camera.position.set(0, 2, 5);
    controls.target.set(0, 0, 0); // Look at center
    controls.update();

    // const textureLoader = new THREE.TextureLoader();
    
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const percent = Math.round((itemsLoaded / itemsTotal) * 100);
        document.getElementById('loading-percentage').textContent = `${percent}%`;
    };
    
    loadingManager.onLoad = () => {
    document.getElementById('loading-screen').style.display = 'none';
    };

    // Replace the old textureLoader with one that uses loadingManager:
    const textureLoader = new THREE.TextureLoader(loadingManager);

    const groundColorMap = textureLoader.load('https://raw.githubusercontent.com/JackAlt3/CarGame/main/Grass005_4K-PNG_Color.png');
    const groundNormalMap = textureLoader.load('https://raw.githubusercontent.com/JackAlt3/CarGame/main/Grass005_4K-PNG_NormalGL.png');
    
    const roughnessMap = textureLoader.load('https://raw.githubusercontent.com/JackAlt3/CarGame/main/Grass005_4K-PNG_Roughness.png');
    const aoMap = textureLoader.load('https://raw.githubusercontent.com/JackAlt3/CarGame/main/Grass005_4K-PNG_AmbientOcclusion.png');
    const displacementMap = textureLoader.load('https://raw.githubusercontent.com/JackAlt3/CarGame/main/Grass005_4K-PNG_Displacement.png');

    groundColorMap.wrapS = groundColorMap.wrapT = THREE.RepeatWrapping;
    groundColorMap.repeat.set(50, 50);
    groundNormalMap.wrapS = groundNormalMap.wrapT = THREE.RepeatWrapping;
    groundNormalMap.repeat.set(50, 50);
    
    roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(50, 50);
    aoMap.wrapS = aoMap.wrapT = THREE.RepeatWrapping;
    aoMap.repeat.set(50, 50);
    displacementMap.wrapS = displacementMap.wrapT = THREE.RepeatWrapping;
    displacementMap.repeat.set(50, 50);


    
    groundColorMap.colorSpace = THREE.SRGBColorSpace;


    const planeGeometry = new THREE.PlaneGeometry(300, 600, 200, 200);

    planeGeometry.setAttribute(
    'uv2',
    new THREE.BufferAttribute(planeGeometry.attributes.uv.array, 2)
    );

    const planeMaterial = new THREE.MeshStandardMaterial({
        map: groundColorMap,
        normalMap: groundNormalMap,
        roughnessMap: roughnessMap,
        aoMap: aoMap,
        displacementMap: displacementMap,
        displacementScale: 0.1
    });
    planeMaterial.normalScale.set(5, 5);
    planeMaterial.displacementScale = 0.4;
    planeMaterial.roughness = 0.8; 
    planeMaterial.aoMapIntensity = 3.0;

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    // CANNON ground
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    // const gltfLoader = new THREE.GLTFLoader(loadingManager)
    const gltfLoader = new GLTFLoader(loadingManager);


function threeToCannonTrimesh(mesh) {
    const geometry = mesh.geometry.clone();
    
    // Apply world transform (scale, rotation, position) to vertices
    geometry.applyMatrix4(mesh.matrixWorld);

    const vertices = geometry.attributes.position.array;
    const indices = geometry.index
        ? geometry.index.array
        : [...Array(vertices.length / 3).keys()];

    return new CANNON.Trimesh(
        Float32Array.from(vertices),
        Uint16Array.from(indices)
    );
}

// --- Materials ---
const asphaltMat = new CANNON.Material("asphalt");
const iceMat = new CANNON.Material("ice");

// Not really used in RaycastVehicle, but helps if you want collisions later
world.addContactMaterial(new CANNON.ContactMaterial(asphaltMat, asphaltMat, { friction: 1.0 }));
world.addContactMaterial(new CANNON.ContactMaterial(iceMat, iceMat, { friction: 0.01 }));

let path, physicsBody;

gltfLoader.load('https://raw.githubusercontent.com/JackAlt3/CarGame/main/road_propertionbarrier.glb', (gltf) => {
    const collisionMesh = gltf.scene;
    collisionMesh.position.set(0, 2.5, 0);
    // scene.add(path);

    collisionMesh.traverse((child) => {
           if (child.isMesh) {
            child.updateWorldMatrix(true, true); // ensure correct transforms
            const shape = threeToCannonTrimesh(child);

            physicsBody = new CANNON.Body({
                mass: 0,
                shape: shape,
                type: CANNON.Body.STATIC,
                material: iceMat,
                position: new CANNON.Vec3(0, 0, 0)
            });

            world.addBody(physicsBody);
        }
    });

    path = collisionMesh.clone(true);
    path.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    scene.add(path);


});
            
    let model;       // For local player visual
    let baseModel;   // Internal clone source
    let player, player1; // Declare globally so you can use in animate()

    gltfLoader.load('https://raw.githubusercontent.com/JackAlt3/CarGame/main/chassis-simple.glb', (gltf) => {
        baseModel = gltf.scene;

        baseModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Local player model
        model = baseModel.clone(true);
        model.position.set(0, 0, 0);
        model.scale.set(1, 1, 1);
        scene.add(model);

        // Remote player model
        const body = baseModel.clone(true);
        scene.add(body);

        if (!window._playerAssigned) {
            window._playerAssigned = true;
            // const isFirstPlayer = socket.id.endsWith("0") || Math.random() > 0.5; // crude split for 2 clients
            const isFirstPlayer = (socket.id || "").endsWith("0") || Math.random() > 0.5;

            if (isFirstPlayer) {
                player = createVehicleAt(scene, world, 0, 3, 0, gltfLoader);
                player.model = model;

                player1 = createVehicleAt(scene, world, 0, 3, 10, gltfLoader);
                player1.model = body;
            } else {
                player1 = createVehicleAt(scene, world, 0, 3, 0, gltfLoader);
                player1.model = body;

                player = createVehicleAt(scene, world, 0, 3, 10, gltfLoader);
                player.model = model;
            }
            }

        // Array to hold checkpoints
        const checkpoints = [];
        const checkpointPositions = [
            { x: -90, y: 5, z: 0 },   // Checkpoint 1
            { x: 0, y: 5, z: -210 }, // Checkpoint 2
            { x: 90, y: 5, z: 0 },// Checkpoint 3
            { x: 0, y: 5, z: 210 }   // Checkpoint 4
        ];

        for (let i = 0; i < checkpointPositions.length; i++) {
            const shape = new CANNON.Box(new CANNON.Vec3(30, 6, 1));
            const body = new CANNON.Body({ mass: 0, collisionResponse: false });
            body.addShape(shape);
            body.position.set(
                checkpointPositions[i].x,
                checkpointPositions[i].y,
                checkpointPositions[i].z
            );

            if (i === 1 || i === 3) {
                body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2)
            }
            body.isTrigger = true;
            body.isCheckpoint = true;
            body.checkpointIndex = i; // store order number
            world.addBody(body);
            checkpoints.push(body);

            // Visual
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(60, 12, 2),
                new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    transparent: true,
                    opacity: 0.5
                })
            );
            mesh.position.copy(body.position);
            mesh.quaternion.copy(body.quaternion);
            scene.add(mesh);
        }
        // Lap settings
        let currentCheckpointIndex = 0;
        let lapsCompleted = 0;
        const totalLaps = 3; // Change this for number of laps
        let raceStarted = false;
        let winnerDetected = false;

        player.chassisBody.addEventListener('collide', (event) => {
            const otherBody = event.body;

            if (!otherBody.isCheckpoint) return;

            // --- RACE START ---
            if (!raceStarted && otherBody.checkpointIndex === 0) {
                raceStarted = true;
                currentCheckpointIndex = 0; // waiting for checkpoint 1 next
                console.log("Race started!");
                return;
            }

            // --- NORMAL PROGRESSION ---
            if (raceStarted && otherBody.checkpointIndex === currentCheckpointIndex + 1) {
                currentCheckpointIndex++;
            }
            // --- FINISH LINE (from last checkpoint back to start) ---
            else if (
                raceStarted &&
                otherBody.checkpointIndex === 0 &&
                currentCheckpointIndex === checkpoints.length - 1
            ) {
                lapsCompleted++;
                console.log(`Lap ${lapsCompleted} completed!`);

                // Winner check
                if (lapsCompleted >= totalLaps && !winnerDetected) {
                    winnerDetected = true;
                    alert("Winner!");
                    socket.emit('playerWon', { id: socket.id });
                    return;
                }

                // Prepare for next lap
                currentCheckpointIndex = 0; 
            }
        });

        // Optional: sync initial position
        if (player1.model && player1.chassisBody) {
            player1.model.position.copy(player1.chassisBody.position);
            player1.model.quaternion.copy(player1.chassisBody.quaternion);
        }

    }, undefined, (error) => {
        console.error('An error happened while loading the model:', error);
    });

    socket.on('playerMoved', data => {
        if (data.id === socket.id) return; // Ignore own movement
        // No need to clone again – we already assigned player1.model in gltfLoader callback
        if (player1.chassisBody) {
            player1.chassisBody.position.set(data.x, data.y, data.z);
            player1.chassisBody.quaternion.set(data.qx, data.qy, data.qz, data.qw);
            player1.chassisBody.velocity.set(data.vx, data.vy, data.vz);
        }
    });

socket.on('playerWon', (data) => {
    if (data.id === socket.id) {
        alert("🎉 You have won!");
    } else {
        alert(`💀 Player ${data.id} has won!`);
    }
    // Optional: stop game logic here
});

    // Setup directional light
    const light = new THREE.DirectionalLight(0xffffff, 1.8);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048); // Not huge, but enough
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 50; // Keep it tight
    light.shadow.camera.left = -20;
    light.shadow.camera.right = 20;
    light.shadow.camera.top = 20;
    light.shadow.camera.bottom = -20;
    light.shadow.bias = -0.0005; // helps prevent acne
    light.shadow.normalBias = 0.02; // pushes shadow away from surface slightly
    scene.add(light);

function updateLight() {
    if (!player || !player.chassisBody) return; // skip if player isn't ready yet

    const playerPos = player.chassisBody.position.clone();
    light.position.copy(playerPos).add(new THREE.Vector3(10, 20, 10));
    light.target.position.copy(playerPos);
    light.target.updateMatrixWorld();
}



    // Debug helper
    const helper = new THREE.CameraHelper(light.shadow.camera);
    scene.add(helper);


    let isUserInteracting = false;
    let isUserZooming = false;
    let zoomTimeout;
    controls.addEventListener('start', () => { isUserInteracting = true; });
    controls.addEventListener('end', () => { isUserInteracting = false; });
    controls.enableZoom = true;      // Enable zooming (mouse wheel, pinch)
    controls.zoomSpeed = 1.0;        // Adjust zoom speed (default is 1)
    // Listen for wheel events to detect zooming
    renderer.domElement.addEventListener('wheel', () => {
    isUserZooming = true;

    // Clear previous timeout if any
    if (zoomTimeout) clearTimeout(zoomTimeout);

    // After 500ms of no wheel input, consider zoom finished
    zoomTimeout = setTimeout(() => {
        isUserZooming = false;
    }, 500);
    });


    // Key state tracking
    const keys = {};
    window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
    

    const stats = new Stats();
    stats.showPanel(0); // 0 = FPS, 1 = ms, 2 = memory
    document.body.appendChild(stats.dom);

    // Control loop
    function updateControls() {
    if (!player || !player.vehicle) return;
    const engineForce = 400;
    const maxSteer = 0.5;

    player.vehicle.setSteeringValue(0, 2);
    player.vehicle.setSteeringValue(0, 3);
    player.vehicle.setBrake(0, 1);
    player.vehicle.setBrake(0, 0);

    if (keys['w']) {
        player.vehicle.applyEngineForce(engineForce, 0);
        player.vehicle.applyEngineForce(engineForce, 1);
    } else if (keys['s']) {
        player.vehicle.applyEngineForce(-engineForce, 0);
        player.vehicle.applyEngineForce(-engineForce, 1);
    } else {
        player.vehicle.applyEngineForce(0, 0);
        player.vehicle.applyEngineForce(0, 1);
    }

    if (keys['a']) {
        player.vehicle.setSteeringValue(maxSteer, 2);
        player.vehicle.setSteeringValue(maxSteer, 3);
    } else if (keys['d']) {
        player.vehicle.setSteeringValue(-maxSteer, 2);
        player.vehicle.setSteeringValue(-maxSteer, 3);
    }

    if (keys[' ']) {
        player.vehicle.setBrake(10, 0);
        player.vehicle.setBrake(10, 1);
    }
    }
    
    let lastTime;
    let smoothSpeed = 0;
    const cameraOffset = new THREE.Vector3(0, 2, 5);
    
    // let fpsInterval = 1000 / 150; // 33.33ms
    let then = performance.now();

    let frameCount = 0;

    function animate(time) {
        requestAnimationFrame(animate);


        if (!player || !player.chassisBody || !player.vehicle) {
            renderer.render(scene, camera);
            return;
        }
        const now = time;
        const elapsed = now - then;

        // if (elapsed >= fpsInterval) {
            // then = now - (elapsed % fpsInterval); // prevent drift


        // updateWheelFriction(player.vehicle);
             
        const velocity = player.chassisBody.velocity.length(); // in meters/second
        const speedKmh = velocity * 3.6; // convert to km/h
        document.getElementById("speedDisplay").textContent = speedKmh.toFixed(1) + " km/h";
        cannonDebugger.update();
        stats.begin();
          // Don't step physics on the very first frame
        if (lastTime !== undefined) {
            let deltaTime = (time - lastTime) / 1000;
            deltaTime = Math.min(deltaTime, 0.05); // clamp to avoid big jumps

            world.step(1 / 60, deltaTime, 3);
        }
        lastTime = time;
        frameCount++;
        updateControls();

        syncVehicleModel(player);
        syncVehicleModel(player1);



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


        socket.emit('move', {
            id: socket.id,
            x: player.chassisBody.position.x,
            y: player.chassisBody.position.y,
            z: player.chassisBody.position.z,
            qx: player.chassisBody.quaternion.x,
            qy: player.chassisBody.quaternion.y,
            qz: player.chassisBody.quaternion.z,
            qw: player.chassisBody.quaternion.w,
            vx: player.chassisBody.velocity.x,
            vy: player.chassisBody.velocity.y,
            vz: player.chassisBody.velocity.z,
            });

        updateLight()
        stats.end(); 
        renderer.render(scene, camera);
    
    }
// }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
