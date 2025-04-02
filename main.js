import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from "three/addons/controls/OrbitControls";
import TWEEN from "three/addons/libs/tween.module";


function main() {

    const canvas = document.querySelector( '#c' );
    const renderer = new THREE.WebGLRenderer( { antialias: true, canvas } );

    const fov = 75;
    const aspect = 2;
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera( fov, aspect, near, far );
    camera.position.set( 0, 20, -10 );

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

    // Ajouter une GUI pour la position de la caméra
    const cameraFolder = gui.addFolder('Camera Position');
    cameraFolder.add(camera.position, 'x', -100, 100, 0.1).name('Pos X').listen();
    cameraFolder.add(camera.position, 'y', -100, 100, 0.1).name('Pos Y').listen();
    cameraFolder.add(camera.position, 'z', -100, 100, 0.1).name('Pos Z').listen();

    // Ajouter une GUI pour le point de regard (controls.target)
    const targetFolder = gui.addFolder('Camera Target');
    targetFolder.add(controls.target, 'x', -100, 100, 0.1).name('Target X').listen();
    targetFolder.add(controls.target, 'y', -100, 100, 0.1).name('Target Y').listen();
    targetFolder.add(controls.target, 'z', -100, 100, 0.1).name('Target Z').listen();



    const scene = new THREE.Scene();

    const princessModels = [];

    {
        const color = 0xFFFFFF;
        const intensity = 10;
        const light = new THREE.DirectionalLight( color, intensity );
        light.position.set( 0, 2, 4 );
        scene.add( light );
    }

    const loader = new GLTFLoader();

    loader.load('/museum/scene.gltf', (gltf) => {
        scene.add(gltf.scene);
        console.log('Modèle chargé:', gltf.scene);

        const castlePosition = new THREE.Vector3(0, 15, -5);
        camera.lookAt(castlePosition);
        controls.target.copy(castlePosition);
        controls.update();

        scene.traverse((child) => {
            console.log(child.name);
        });

        function loadModelInRoom(scene, roomName, modelPath, positionOffset, scale) {
            const room = scene.getObjectByName(roomName);
            if (room) {
                console.log(`Pièce trouvée : ${roomName}`, room);
                const position = new THREE.Vector3(
                    room.position.x + positionOffset.x,
                    room.position.y + positionOffset.y,
                    room.position.z + positionOffset.z
                );
                loadModel(modelPath, position, scale, roomName);
            }
            return room;
        }

        const roomsToLoad = [
            { name: "Porcelain_Room", modelPath: '/princesses/rapunzel/scene.gltf', positionOffset: { x: 3, y: 2.1, z: -8 }, scale: { x: 1.5, y: 1.5, z: 1.5 } },
            // { name: "Dining_Room", modelPath: '/princesses/ariel/scene.gltf', positionOffset: { x: -3, y: 6, z: 0 }, scale: { x: 0.01, y: 0.01, z: 0.01 } },
            { name: "Billiard_Room", modelPath: '/princesses/elsa/scene.gltf', positionOffset: { x: 4, y: 6, z: 2 }, scale: { x: 0.15, y: 0.15, z: 0.15 } },
            { name: "Armoury", modelPath: '/princesses/alice/scene.gltf', positionOffset: { x: 3, y: 10.5, z: 10 }, scale: { x: 0.15, y: 0.15, z: 0.15 } },
            { name: "Smoking_Room", modelPath: '/princesses/belle/scene.gltf', positionOffset: { x: 4, y: 14.2, z: 15 }, scale: { x: 0.01, y: 0.01, z: 0.01 } },
            { name: "Great_Drawing_Room", modelPath: '/princesses/ariel/scene.gltf', positionOffset: { x: 2, y: 14.2, z: 15 }, scale: { x: 0.01, y: 0.01, z: 0.01 } },
            { name: "Small_Drawing_Room", modelPath: '/princesses/mulan/scene.gltf', positionOffset: { x: -3, y: 14.2, z: 15 }, scale: { x: 0.17, y: 0.17, z: 0.17 } },
            { name: "Upper_Vestibule", modelPath: '/princesses/merida/scene.gltf', positionOffset: { x: -1.6, y: 10.2, z: 6 }, scale: { x: 0.17, y: 0.17, z: 0.17 } },
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

        const missingRooms = roomsToLoad
            .filter((_, index) => !loadedRooms[index])
            .map(roomConfig => roomConfig.name);
        if (missingRooms.length > 0) {
            console.warn("⚠️ Pièces non trouvées, vérifie les noms dans console.log :", missingRooms);
        }

        // Générer les positions des caméras en fonction des pièces
        const cameraPositions = [
            { position: new THREE.Vector3(0, 20, -10), lookAt: new THREE.Vector3(0, 15, -5), name: "Initial View" },
            { position: new THREE.Vector3(12.9, 6, -5.5), lookAt: new THREE.Vector3(-15, 7, 8), name: "Porcelain_Room" },
            { position: new THREE.Vector3(7.5, 6, 0), lookAt: new THREE.Vector3(20, 7, 10), name: "Billiard_Room" },
            { position: new THREE.Vector3(10, 6, 9.3), lookAt: new THREE.Vector3(-8, 7, 30), name: "Armoury" },
            { position: new THREE.Vector3(10.5, 6, 15.3), lookAt: new THREE.Vector3(0, 7, 50), name: "Smoking_Room" },
            { position: new THREE.Vector3(6.5, 6, 20.5), lookAt: new THREE.Vector3(-30, 7, 10), name: "Great_Drawing_Room" },
            { position: new THREE.Vector3(-7.2, 6, 21.5), lookAt: new THREE.Vector3(-10, 7, 10), name: "Small_Drawing_Room" },
            { position: new THREE.Vector3(-6.1, 6, 15.2), lookAt: new THREE.Vector3(-7, 7, 5), name: "Upper_Vestibule" },
        ];

        const buttonContainer = document.querySelector('.camera__menu');
        if (!buttonContainer) {
            console.error("Conteneur .camera__menu non trouvé dans le DOM");
            return;
        }

        cameraPositions.forEach((camPos) => {
            const button = document.createElement('button');
            button.textContent = camPos.name.replaceAll('_', ' ');
            buttonContainer.appendChild(button);

            button.addEventListener('click', () => {
                moveCameraToPosition(camPos.position, camPos.lookAt, camPos.name);
            });
        });

    },undefined, function ( error ) {
        console.error("Erreur de chargement du modèle:", error);
    });

    function moveCameraToPosition(position, lookAt, name) {
        new TWEEN.Tween(camera.position)
            .to(position, 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                camera.lookAt(lookAt);
                if (controls) controls.update();
            })
            .onComplete(() => {
                // Activer ou désactiver les contrôles en fonction du nom
                if (name === "Initial View") {
                    console.log('test')
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
                descriptionElements.forEach(p => p.classList.remove('active')); // Masquer toutes les descriptions
                const activeDescription = descriptionContainer.querySelector(`.description__container[data-room="${name}"]`);
                if (activeDescription) {
                    activeDescription.classList.add('active'); // Afficher la description correspondante
                } else {
                    console.warn(`Aucune description trouvée pour la pièce : ${name}`);
                }
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
    }

    function loadModel(url, position, scale, roomName) {
        loader.load(url, (gltf) => {
            gltf.scene.position.copy(position);
            gltf.scene.scale.set(scale.x, scale.y, scale.z);
            scene.add(gltf.scene);
            princessModels.push({ model: gltf.scene, name: roomName });
            console.log(`Modèle chargé à la position:`, position);
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
            princess.model.rotation.y += 0.01; // Vitesse de rotation (ajuste selon tes besoins)
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