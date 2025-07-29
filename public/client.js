    import { createVehicleAt } from './vehicle.js';

    console.log('CANNON loaded:', CANNON); // should show full object
    const scene = new THREE.Scene();
    const socket = io(); 
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Earth gravity

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

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
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

        const groundColorMap = textureLoader.load('https://raw.githubusercontent.com/JackAlt3/CarGame/main/red_brick_diff_4k.jpg');
        const groundNormalMap = textureLoader.load('https://raw.githubusercontent.com/JackAlt3/CarGame/main/red_brick_nor_gl_4k.png');


        groundColorMap.wrapS = groundColorMap.wrapT = THREE.RepeatWrapping;
        groundColorMap.repeat.set(3, 3);
        groundNormalMap.wrapS = groundNormalMap.wrapT = THREE.RepeatWrapping;
        groundNormalMap.repeat.set(3, 3);

        const planeGeometry = new THREE.PlaneGeometry(100, 100);
        const planeMaterial = new THREE.MeshPhysicalMaterial({
            map: groundColorMap,
            normalMap: groundNormalMap,
        });

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

        const gltfLoader = new THREE.GLTFLoader(loadingManager);

/*         const player = createVehicleAt(scene, world, 0, 3, 0, gltfLoader);
        const player1 = createVehicleAt(scene, world, 0, 3, 10, gltfLoader);
        if (player1.model && player1.chassisBody) {
            player1.model.position.copy(player1.chassisBody.position);
            player1.model.quaternion.copy(player1.chassisBody.quaternion);
        } */


        let model;       // For local player visual
        let baseModel;   // Internal clone source
        let player, player1; // Declare globally so you can use in animate()

        gltfLoader.load('https://raw.githubusercontent.com/JackAlt3/CarGame/main/chassis.glb', (gltf) => {
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
                const isFirstPlayer = socket.id.endsWith("0") || Math.random() > 0.5; // crude split for 2 clients

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

/*                     socket.on('playerMoved', data => {
            console.log(`🔄 Player ${data.id} moved to x=${data.x}, y=${data.y}, z=${data.z}`);
            // Update other players in the game world here
            }); */

        

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(20, 50, 20);
        light.castShadow = true;
        light.shadow.mapSize.set(4096, 4096);

        const shadowCam = light.shadow.camera;
        shadowCam.left = -75;
        shadowCam.right = 75;
        shadowCam.top = 75;
        shadowCam.bottom = -75;
        shadowCam.near = 1;
        shadowCam.far = 150;
        light.shadow.bias = -0.0005;
        light.shadow.normalBias = 0.02; // Helps with shadow clipping at edges

        scene.add(light);
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
        // let smoothedCameraPos = new THREE.Vector3();
        // let smoothedLookTarget = new THREE.Vector3();
        const cameraOffset = new THREE.Vector3(0, 2, 5);
        
        let fpsInterval = 1000 / 30; // 33.33ms
        let then = performance.now();
        
        let frameCount = 0;
        // Animate
        function animate(time) {
            requestAnimationFrame(animate);
            const now = time;
            const elapsed = now - then;

            if (elapsed >= fpsInterval) {
                then = now - (elapsed % fpsInterval); // prevent drift


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

            if(model && player.chassisBody){
                // Offset vector (e.g., 0.5 units down on Y axis)
                const visualOffset = new THREE.Vector3(0, -0.6, 0);
                // Create a copy of chassisBody's quaternion and rotate the offset
                const offset = visualOffset.clone().applyQuaternion(player.chassisBody.quaternion);
                // Apply offset to the position
                model.position.copy(player.chassisBody.position).add(offset);
                model.quaternion.copy(player.chassisBody.quaternion);
                player.chassisWire.position.copy(player.chassisBody.position);
                player.chassisWire.quaternion.copy(player.chassisBody.quaternion);
            }

            // Sync wheels
            for (let i = 0; i < player.vehicle.wheelInfos.length; i++) {
                player.vehicle.updateWheelTransform(i);
                const t = player.vehicle.wheelInfos[i].worldTransform;
                player.wheelMeshes[i].position.copy(t.position);
                player.wheelMeshes[i].quaternion.copy(t.quaternion);
            }

          if (player1.model && player1.chassisBody) {
                const visualOffset1 = new THREE.Vector3(0, -0.6, 0);
                const offset1 = visualOffset1.clone().applyQuaternion(player1.chassisBody.quaternion);
                player1.model.position.copy(player1.chassisBody.position).add(offset1);
                player1.model.quaternion.copy(player1.chassisBody.quaternion);

                if (player1.chassisWire) {
                    player1.chassisWire.position.copy(player1.chassisBody.position);
                    player1.chassisWire.quaternion.copy(player1.chassisBody.quaternion);
                }

                if (player1.vehicle && player1.wheelMeshes) {
                    for (let i = 0; i < player1.vehicle.wheelInfos.length; i++) {
                        player1.vehicle.updateWheelTransform(i);
                        const t = player1.vehicle.wheelInfos[i].worldTransform;
                        player1.wheelMeshes[i].position.copy(t.position);
                        player1.wheelMeshes[i].quaternion.copy(t.quaternion);
                    }
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


            stats.end(); 
            renderer.render(scene, camera);
        
        }
    }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });