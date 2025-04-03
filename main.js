import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from "three/addons/controls/OrbitControls";
import TWEEN from "three/addons/libs/tween.module";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';


function main() {

    const canvas = document.querySelector( '#c' );
    const renderer = new THREE.WebGLRenderer( { antialias: true, canvas } );

    const fov = 75;
    const aspect = 2;
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera( fov, aspect, near, far );
    camera.position.set( 0, 20, -10 );

    const scene = new THREE.Scene();

    renderer.shadowMap.enabled = true;

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.7,
        0.4,
        0.85
    );
    composer.addPass(bloomPass);

    class MinMaxGUIHelper {
        constructor(obj, minProp, maxProp, minDif) {
            this.obj = obj;
            this.minProp = minProp;
            this.maxProp = maxProp;
            this.minDif = minDif;
        }
        get min() {
            return this.obj[this.minProp];
        }
        set min(v) {
            this.obj[this.minProp] = v;
            this.obj[this.maxProp] = Math.max(this.obj[this.maxProp], v + this.minDif);
        }
        get max() {
            return this.obj[this.maxProp];
        }
        set max(v) {
            this.obj[this.maxProp] = v;
            this.min = this.min;
        }
    }

    function updateCamera() {
        camera.updateProjectionMatrix();
    }

    const gui = new GUI();
    gui.add(camera, 'fov', 1, 180).onChange(updateCamera);
    const minMaxGUIHelper = new MinMaxGUIHelper(camera, 'near', 'far', 0.1);
    gui.add(minMaxGUIHelper, 'min', 0.1, 50, 0.1).name('near').onChange(updateCamera);
    gui.add(minMaxGUIHelper, 'max', 0.1, 50, 0.1).name('far').onChange(updateCamera);

    const controls = new OrbitControls( camera, canvas );
    controls.target.set(0, 15, 0);
    controls.update();

    const cameraFolder = gui.addFolder('Camera Position');
    cameraFolder.add(camera.position, 'x', -100, 100, 0.1).name('Pos X').listen();
    cameraFolder.add(camera.position, 'y', -100, 100, 0.1).name('Pos Y').listen();
    cameraFolder.add(camera.position, 'z', -100, 100, 0.1).name('Pos Z').listen();

    const targetFolder = gui.addFolder('Camera Target');
    targetFolder.add(controls.target, 'x', -100, 100, 0.1).name('Target X').listen();
    targetFolder.add(controls.target, 'y', -100, 100, 0.1).name('Target Y').listen();
    targetFolder.add(controls.target, 'z', -100, 100, 0.1).name('Target Z').listen();


    const video = document.createElement('video');
    video.src = '/background.mov';
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(error => {
        console.error("Erreur lors de la lecture de la vidéo:", error);
    });

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    scene.background = videoTexture;

    const princessModels = [];

    const cameraPositions = [
        { position: new THREE.Vector3(0, 20, -10), lookAt: new THREE.Vector3(0, 15, -5), name: "Initial View" },
        { position: new THREE.Vector3(12.9, 6, -5.5), lookAt: new THREE.Vector3(-15, 7, 8), name: "Porcelain_Room" },
        { position: new THREE.Vector3(7.5, 6, 0), lookAt: new THREE.Vector3(20, 7, 10), name: "Billiard_Room" },
        { position: new THREE.Vector3(10, 6, 9.3), lookAt: new THREE.Vector3(-8, 7, 30), name: "Armoury" },
        { position: new THREE.Vector3(10.5, 6, 15.3), lookAt: new THREE.Vector3(0, 7, 50), name: "Smoking_Room" },
        { position: new THREE.Vector3(6.5, 6, 20.5), lookAt: new THREE.Vector3(-30, 7, 10), name: "Great_Drawing_Room" },
        { position: new THREE.Vector3(-7.2, 6, 21.5), lookAt: new THREE.Vector3(-10, 7, 10), name: "Small_Drawing_Room" },
        { position: new THREE.Vector3(-6.1, 6, 15.2), lookAt: new THREE.Vector3(-7, 7, 5), name: "Upper_Vestibule" },
        { position: new THREE.Vector3(-6.1, 6, 7.6), lookAt: new THREE.Vector3(-8, 7, 5), name: "Dining_Room" },
        { position: new THREE.Vector3(-10, 6, -4.2), lookAt: new THREE.Vector3(0, 7, -10), name: "Serving_Room" },
    ];

    const loader = new GLTFLoader();

    let currentRoomIndex = -1;
    let clickCounter = 0;
    let isEasterEggTriggered = false;
    let postEasterEggIndex = 0;
    let easterEggModel = null;

    function updatePrincessDescriptionVisibility() {
        const princessDescription = document.querySelector('.princess__description');
        const activeDescription = document.querySelector('.description__container.active');

        if (!activeDescription || currentRoomIndex === -1 || isEasterEggTriggered) {
            princessDescription.style.display = 'none';
        } else {
            princessDescription.style.display = 'block';
        }
    }

    loader.load('/museum/scene.gltf', (gltf) => {
        scene.add(gltf.scene);

        const castlePosition = new THREE.Vector3(0, 15, -5);
        camera.lookAt(castlePosition);
        controls.target.copy(castlePosition);
        controls.update();

        const textureLoader = new THREE.TextureLoader();
        const wallTexture = textureLoader.load('/brick.gltf/textures/brick_pavement_02_arm_4k.jpg');
        const wallNormal = textureLoader.load('/brick.gltf/textures/brick_pavement_02_nor_gl_4k.jpg');
        const wallBump = textureLoader.load('/brick.gltf/textures/brick_pavement_02_diff_4k.jpg');
        const wallDisplacement = textureLoader.load('/brick.gltf/textures/brick_pavement_02_diff_4k.jpg');

        const wallMaterial = new THREE.MeshStandardMaterial({
            map: wallTexture,
            color: 0x0000FF,
            normalMap: wallNormal,
            bumpMap: wallBump,
            bumpScale: 0.1,
            displacementMap: wallDisplacement,
            displacementScale: 0.2,
            roughness: 0.7,
            metalness: 0.1
        });

        const wallGeometry = new THREE.PlaneGeometry(5, 5, 16, 16);
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(-5, 5, 10);
        wall.rotation.y = Math.PI;
        wall.receiveShadow = true;
        wall.castShadow = true;
        scene.add(wall);

        function loadModelInRoom(scene, roomName, modelPath, positionOffset, scale) {
            const room = scene.getObjectByName(roomName);
            if (room) {
                const position = new THREE.Vector3(
                    room.position.x + positionOffset.x,
                    room.position.y + positionOffset.y,
                    room.position.z + positionOffset.z
                );
                const cameraPos = cameraPositions.find(camPos => camPos.name === roomName);
                if (cameraPos) {
                    loadModel(modelPath, position, scale, roomName, cameraPos.position);
                } else {
                    console.warn(`Position de caméra non trouvée pour ${roomName}, pas de lumière ajoutée.`);
                    loadModel(modelPath, position, scale, roomName, position);
                }
            }
            return room;
        }

        const roomsToLoad = [
            { name: "Porcelain_Room", modelPath: '/princesses/rapunzel/scene.gltf', positionOffset: { x: 3, y: 2.1, z: -8 }, scale: { x: 1.5, y: 1.5, z: 1.5 } },
            { name: "Billiard_Room", modelPath: '/princesses/elsa/scene.gltf', positionOffset: { x: 4, y: 6, z: 2 }, scale: { x: 0.15, y: 0.15, z: 0.15 } },
            { name: "Armoury", modelPath: '/princesses/alice/scene.gltf', positionOffset: { x: 3, y: 10.5, z: 10 }, scale: { x: 0.15, y: 0.15, z: 0.15 } },
            { name: "Smoking_Room", modelPath: '/princesses/belle/scene.gltf', positionOffset: { x: 4, y: 14.2, z: 15 }, scale: { x: 0.01, y: 0.01, z: 0.01 } },
            { name: "Great_Drawing_Room", modelPath: '/princesses/ariel/scene.gltf', positionOffset: { x: 2, y: 14.2, z: 15 }, scale: { x: 0.01, y: 0.01, z: 0.01 } },
            { name: "Small_Drawing_Room", modelPath: '/princesses/mulan/scene.gltf', positionOffset: { x: -3, y: 14.2, z: 15 }, scale: { x: 0.17, y: 0.17, z: 0.17 } },
            { name: "Upper_Vestibule", modelPath: '/princesses/merida/scene.gltf', positionOffset: { x: -1.7, y: 10.2, z: 7 }, scale: { x: 0.17, y: 0.17, z: 0.17 } },
            { name: "Dining_Room", modelPath: '/princesses/cinderella/scene.gltf', positionOffset: { x: -2.5, y: 5.5, z: -1 }, scale: { x: 0.09, y: 0.09, z: 0.09 } },
            { name: "Serving_Room", modelPath: '/princesses/anna/scene.gltf', positionOffset: { x: -2, y: 1.85, z: -9 }, scale: { x: 1.1, y: 1.1, z: 1.1 } },
        ];

        const loadedRooms = roomsToLoad.map(roomConfig =>
            loadModelInRoom(
                gltf.scene,
                roomConfig.name,
                roomConfig.modelPath,
                roomConfig.positionOffset,
                roomConfig.scale || gltf.scene.getObjectByName(roomConfig.name)?.scale || new THREE.Vector3(1, 1, 1)
            )
        );

        let easterEggModel = null;

        const easterEggPosition = new THREE.Vector3(9, -1, -12);
        const easterEggScale = new THREE.Vector3(1, 1, 1);
        loader.load('/karmine_corp.glb', (gltf) => {
            gltf.scene.position.copy(easterEggPosition);
            gltf.scene.scale.set(easterEggScale.x, easterEggScale.y, easterEggScale.z);
            gltf.scene.visible = false;
            scene.add(gltf.scene);
            easterEggModel = gltf.scene;
        }, undefined, function (error) {
            console.error("Erreur de chargement de l'easter egg:", error);
        });


        const missingRooms = roomsToLoad
            .filter((_, index) => !loadedRooms[index])
            .map(roomConfig => roomConfig.name);
        if (missingRooms.length > 0) {
            console.warn("⚠️ Pièces non trouvées, vérifie les noms dans console.log :", missingRooms);
        }

        const buttonContainer = document.querySelector('.camera__menu');
        if (!buttonContainer) {
            console.error("Conteneur .camera__menu non trouvé dans le DOM");
            return;
        }

        const roomPositions = cameraPositions.filter(camPos => camPos.name !== "Initial View");

        const postEasterEggPositions = [
            { position: new THREE.Vector3(-9.7, 6, 11.5), lookAt: new THREE.Vector3(-5, 0, 11.5) },
            { position: new THREE.Vector3(-4.5, 1.6, 11.5), lookAt: new THREE.Vector3(-5, 0, 0) },
        ];

        const initialViewButton = document.createElement('button');
        initialViewButton.textContent = 'Initial View';
        buttonContainer.appendChild(initialViewButton);

        initialViewButton.addEventListener('click', () => {
            const initialView = cameraPositions.find(camPos => camPos.name === "Initial View");
            if (initialView) {
                moveCameraToPosition(initialView.position, initialView.lookAt, initialView.name);
                currentRoomIndex = -1;
                clickCounter = 0;
                isEasterEggTriggered = false;
                postEasterEggIndex = 0;

                if (easterEggModel) {
                    easterEggModel.visible = false;
                }

                updatePrincessDescriptionVisibility();
            }


        });

        const prevButton = document.createElement('button');
        prevButton.textContent = '← Précédent';
        buttonContainer.appendChild(prevButton);

        prevButton.addEventListener('click', () => {
            if (currentRoomIndex > 0) {
                currentRoomIndex--;
                const camPos = roomPositions[currentRoomIndex];
                moveCameraToPosition(camPos.position, camPos.lookAt, camPos.name);
                clickCounter = 0;
                if (easterEggModel) {
                    easterEggModel.visible = false;
                }
            } else if (currentRoomIndex === 0) {
                const initialView = cameraPositions.find(camPos => camPos.name === "Initial View");
                if (initialView) {
                    moveCameraToPosition(initialView.position, initialView.lookAt, initialView.name);
                    currentRoomIndex = -1;
                    clickCounter = 0;
                    isEasterEggTriggered = false;
                    postEasterEggIndex = 0;
                    if (easterEggModel) {
                        easterEggModel.visible = false;
                    }
                }
            }

            updatePrincessDescriptionVisibility();
        });

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Suivant →';
        buttonContainer.appendChild(nextButton);

        nextButton.addEventListener('click', () => {
            if (!isEasterEggTriggered) {

                if (currentRoomIndex < roomPositions.length - 1) {
                    currentRoomIndex++;
                    const camPos = roomPositions[currentRoomIndex];
                    moveCameraToPosition(camPos.position, camPos.lookAt, camPos.name);
                    clickCounter = 0;
                } else if (currentRoomIndex === roomPositions.length - 1) {
                    clickCounter++;
                    if (clickCounter >= 3) {
                        easterEgg();
                        clickCounter = 0;
                        isEasterEggTriggered = true;
                        updatePrincessDescriptionVisibility();
                    } else {
                        console.log(`Encore ${3 - clickCounter} clics pour déclencher l'easter egg.`);
                    }
                }
            } else {

                if (postEasterEggIndex < postEasterEggPositions.length) {

                    controls.enabled = false;
                    const target = postEasterEggPositions[postEasterEggIndex];
                    const tweenPosition = new TWEEN.Tween(camera.position)
                        .to(target.position, 2000)
                        .easing(TWEEN.Easing.Quadratic.InOut)
                        .onUpdate(() => {
                            camera.lookAt(target.lookAt);
                            controls.target.copy(target.lookAt);
                            controls.update();
                        })
                        .onComplete(() => {
                            controls.enabled = true;
                            postEasterEggIndex++;
                            if (postEasterEggIndex >= postEasterEggPositions.length) {
                                if (easterEggModel) {
                                    easterEggModel.visible = true;
                                }
                                currentRoomIndex = -1;
                                isEasterEggTriggered = false;
                                postEasterEggIndex = 0;
                            }
                            updatePrincessDescriptionVisibility();
                        });

                    const tweenTarget = new TWEEN.Tween(controls.target)
                        .to(target.lookAt, 2000)
                        .easing(TWEEN.Easing.Quadratic.InOut)
                        .onComplete(() => {
                            controls.update();
                        });

                    tweenPosition.start();
                    tweenTarget.start();
                }
            }
        });
        updatePrincessDescriptionVisibility();

    },undefined, function ( error ) {
        console.error("Erreur de chargement du modèle:", error);
    });

    function easterEgg() {
        controls.enabled = false;
        const easterEggPositions = [
            { position: new THREE.Vector3(0, 30, 20), lookAt: new THREE.Vector3(0, 0, 0) },
            { position: new THREE.Vector3(20, 10, 0), lookAt: new THREE.Vector3(0, 10, 0) },
            { position: new THREE.Vector3(0, 10, -20), lookAt: new THREE.Vector3(0, 10, 0) },
            { position: new THREE.Vector3(-20, 10, 0), lookAt: new THREE.Vector3(0, 10, 0) },
            { position: new THREE.Vector3(-9.7, 15, 11.5), lookAt: new THREE.Vector3(-5, 0, 11.5) }
        ];

        function animateToPosition(index) {
            if (index >= easterEggPositions.length) {
                controls.enabled = true;
                updatePrincessDescriptionVisibility();
                return;
            }

            const target = easterEggPositions[index];
            const tweenPosition = new TWEEN.Tween(camera.position)
                .to(target.position, 2000)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    camera.lookAt(target.lookAt);
                    controls.target.copy(target.lookAt);
                    controls.update();
                })
                .onComplete(() => {
                    animateToPosition(index + 1);
                });

            const tweenTarget = new TWEEN.Tween(controls.target)
                .to(target.lookAt, 2000)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onComplete(() => {
                    controls.update();
                });

            tweenPosition.start();
            tweenTarget.start();
        }
        animateToPosition(0);
    }




    function moveCameraToPosition(position, lookAt, name) {
        new TWEEN.Tween(camera.position)
            .to(position, 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                camera.lookAt(lookAt);
                if (controls) controls.update();
            })
            .onComplete(() => {
                if (name === "Initial View") {
                    controls.enablePan = true;
                    controls.enableZoom = true;
                    controls.enableRotate = true;
                } else {
                    controls.enablePan = false;
                    controls.enableZoom = false;
                    controls.enableRotate = true;
                }

                const descriptionContainer = document.querySelector('.princess__description');
                const descriptionElements = descriptionContainer.querySelectorAll('.description__container');
                descriptionElements.forEach(p => p.classList.remove('active'));
                const activeDescription = descriptionContainer.querySelector(`.description__container[data-room="${name}"]`);
                if (activeDescription) {
                    activeDescription.classList.add('active');
                } else {
                    console.warn(`Aucune description trouvée pour la pièce : ${name}`);
                }

                updatePrincessDescriptionVisibility();
            })
            .start();

        if (controls) {
            new TWEEN.Tween(controls.target)
                .to(lookAt, 1000)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onComplete(() => {
                    controls.update();
                })
                .start();
        }

        updatePrincessDescriptionVisibility();
    }

    function loadModel(url, position, scale, roomName, cameraPosition) {
        loader.load(url, (gltf) => {
            gltf.scene.position.copy(position);
            gltf.scene.scale.set(scale.x, scale.y, scale.z);
            scene.add(gltf.scene);
            princessModels.push({ model: gltf.scene, name: roomName });

            const light = new THREE.PointLight(0xffffff, 30, 10);
            light.position.copy(cameraPosition);
            light.castShadow = true;
            scene.add(light);

        }, undefined, function (error) {
            console.error(`Erreur de chargement du modèle ${url}:`, error);
        });
    }

    function resizeRendererToDisplaySize( renderer ) {

        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (canvas.width !== width || canvas.height !== height) {
            renderer.setSize(width, height, false);
            return true;
        }
        return false;
    }

    function render() {
        if (resizeRendererToDisplaySize(renderer)) {
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }
        TWEEN.update();
        princessModels.forEach(princess => {
            princess.model.rotation.y += 0.01;
        });
        renderer.render( scene, camera );
        requestAnimationFrame( render );
    }

    requestAnimationFrame( render );

    class AxisGridHelper {
        constructor(node, units = 10) {
            const axes = new THREE.AxesHelper();
            axes.material.depthTest = false;
            axes.renderOrder = 2;
            node.add(axes);

            const grid = new THREE.GridHelper(units, units);
            grid.material.depthTest = false;
            grid.renderOrder = 1;
            node.add(grid);

            this.grid = grid;
            this.axes = axes;
            this.visible = false;
        }
        get visible() {
            return this._visible;
        }
        set visible(v) {
            this._visible = v;
            this.grid.visible = v;
            this.axes.visible = v;
        }
    }

    function makeAxisGrid(node, label, units) {
        const helper = new AxisGridHelper(node, units);
        gui.add(helper, 'visible').name(label);
    }

    makeAxisGrid(scene, 'scene')

}

main();