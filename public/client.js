
    console.log('CANNON loaded:', CANNON); // should show full object
    const scene = new THREE.Scene();
    let model;
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


        gltfLoader.load('https://raw.githubusercontent.com/JackAlt3/CarGame/main/chassis.glb', (gltf) => {
        model = gltf.scene;
        model.position.set(0, 0, 0);
        model.scale.set(1, 1, 1);

        model.traverse((child) => {
            if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            }
        });

        scene.add(model);

        // checkAllModelsLoaded(); // <- ADD THIS
        // Optional: move camera or update logic to follow this model
        }, undefined, (error) => {
        console.error('An error happened while loading the model:', error);
        });

        // 1. Create the chassis body
        const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2)); // Width, height, length (half extents)
        const chassisBody = new CANNON.Body({ mass: 150 });
        chassisBody.addShape(chassisShape);
        chassisBody.position.set(0, 3, 0);
        chassisBody.angularDamping = 0.5;
        world.addBody(chassisBody);

        const chassisWireGeo = new THREE.BoxGeometry(2, 1, 4); // Same full extents as chassisShape (2x0.5x2)
        const chassisWireMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        const chassisWire = new THREE.Mesh(chassisWireGeo, chassisWireMat);
        scene.add(chassisWire);

        // Vehicle
        const vehicle = new CANNON.RaycastVehicle({
        chassisBody,
        indexRightAxis: 0,
        indexUpAxis: 1,
        indexForwardAxis: 2,
        });

        const wheelMeshes = [];
        const wheelRadius = 0.35;

        const wheelOptions = {
        radius: wheelRadius,
        directionLocal: new CANNON.Vec3(0, -1, 0),          // down
        suspensionStiffness: 30,
        suspensionRestLength: 0.3,
        frictionSlip: 5,
        dampingRelaxation: 2.3,
        dampingCompression: 4.4,
        maxSuspensionForce: 100000,
        rollInfluence: 0.01,
        axleLocal: new CANNON.Vec3(-1, 0, 0),               // left
        maxSuspensionTravel: 0.3,
        customSlidingRotationalSpeed: -30,
        useCustomSlidingRotationalSpeed: true
        };

        const wheelPositions = [
            new CANNON.Vec3(-0.858, 0, 1.75), // Rear-left
            new CANNON.Vec3(0.76, 0, 1.78),  // Rear-right
            new CANNON.Vec3(-0.858, 0, -1.15),// Front-left
            new CANNON.Vec3(0.76, 0, -1.15), // Front-right
        ];

        wheelPositions.forEach(pos => {
            const options = {
                ...wheelOptions, // shallow clone
                chassisConnectionPointLocal: pos.clone() // unique Vec3 instance
            };
            vehicle.addWheel(options);
        });

        vehicle.addToWorld(world);
        chassisBody.position.set(0, 3, 0);


         vehicle.wheelInfos.forEach((wheel, index) => {
         gltfLoader.load('https://raw.githubusercontent.com/JackAlt3/CarGame/main/wheels.glb', gltf => {
             const wheelModel = gltf.scene;

             // Scale and rotate if needed
             wheelModel.scale.set(1, 1, 1); // Adjust to your model size
             wheelModel.rotation.x = Math.PI / 2; // Align rotation if necessary

                     // Flip if it's a right-side wheel (x > 0)
             if (vehicle.wheelInfos[index].chassisConnectionPointLocal.x > 0) {
                 wheelModel.scale.x *= -1; // Mirror the wheel
            }

             // Wrapper for easier transform sync
             const wheelWrapper = new THREE.Object3D();
             wheelWrapper.add(wheelModel);
             scene.add(wheelWrapper);

             wheelMeshes[index] = wheelWrapper;
            //  checkAllModelsLoaded(); // <- ADD THIS
        });
        });

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

        const otherPlayers = {};  

        // This must be OUTSIDE animate() to avoid multiple listeners!
        socket.on('playerMoved', data => {
            if (data.id === socket.id) return;

            let other = otherPlayers[data.id];

            if (!other) {
                const geom = new THREE.BoxGeometry(1, 1, 1);
                const mat = new THREE.MeshStandardMaterial({ color: 0x0000ff });
                const cube = new THREE.Mesh(geom, mat);
                scene.add(cube);
                otherPlayers[data.id] = cube;
                other = cube;
            }

            other.position.set(data.x, data.y, data.z);
        });

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

        vehicle.setSteeringValue(0, 2);
        vehicle.setSteeringValue(0, 3);
        vehicle.setBrake(0, 1);
        vehicle.setBrake(0, 0);

        if (keys['w']) {
            vehicle.applyEngineForce(engineForce, 0);
            vehicle.applyEngineForce(engineForce, 1);
        } else if (keys['s']) {
            vehicle.applyEngineForce(-engineForce, 0);
            vehicle.applyEngineForce(-engineForce, 1);
        } else {
            vehicle.applyEngineForce(0, 0);
            vehicle.applyEngineForce(0, 1);
        }

        if (keys['a']) {
            vehicle.setSteeringValue(maxSteer, 2);
            vehicle.setSteeringValue(maxSteer, 3);
        } else if (keys['d']) {
            vehicle.setSteeringValue(-maxSteer, 2);
            vehicle.setSteeringValue(-maxSteer, 3);
        }

        if (keys[' ']) {
            vehicle.setBrake(10, 0);
            vehicle.setBrake(10, 1);
        }
        }
        let lastTime;
        let smoothSpeed = 0;
        let smoothedCameraPos = new THREE.Vector3();
        let smoothedLookTarget = new THREE.Vector3();
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

            if(model && chassisBody){
                // Offset vector (e.g., 0.5 units down on Y axis)
                const visualOffset = new THREE.Vector3(0, -0.6, 0);
                // Create a copy of chassisBody's quaternion and rotate the offset
                const offset = visualOffset.clone().applyQuaternion(chassisBody.quaternion);
                // Apply offset to the position
                model.position.copy(chassisBody.position).add(offset);
                model.quaternion.copy(chassisBody.quaternion);
                chassisWire.position.copy(chassisBody.position);
                chassisWire.quaternion.copy(chassisBody.quaternion);
            }

            // Sync wheels
            for (let i = 0; i < vehicle.wheelInfos.length; i++) {
                vehicle.updateWheelTransform(i);
                const t = vehicle.wheelInfos[i].worldTransform;
                wheelMeshes[i].position.copy(t.position);
                wheelMeshes[i].quaternion.copy(t.quaternion);
            }

            if (keys['8']) chassisBody.position.y += 0.1;
            if (keys['2']) chassisBody.position.y -= 0.1;

            const lerpFactor = 0.1;
            const maxSpeed = 0.5;
            // const cameraOffset = new THREE.Vector3(0, 2, 5);
            const bodyPos = new THREE.Vector3().copy(chassisBody.position);
            const desiredCameraPos = bodyPos.clone().add(cameraOffset.clone().applyQuaternion(chassisBody.quaternion));

            const currentSpeed = chassisBody.velocity.length();
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


            if (frameCount % 30 === 0 && chassisBody) {
                const { x, y, z } = chassisBody.position;
                console.log(`📍 My position: x=${x.toFixed(2)}, y=${y.toFixed(2)}, z=${z.toFixed(2)}`);
                socket.emit('move', { x, y, z });
            }
            socket.on('playerMoved', data => {
            console.log(`🔄 Player ${data.id} moved to x=${data.x}, y=${data.y}, z=${data.z}`);
            // Update other players in the game world here
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