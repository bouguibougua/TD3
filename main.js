import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { GLTFLoader } from 'three/addons/webxr/GLTFLoader.js';
import { OrbitControls } from 'three/addons/webxr/OrbitControls.js';

let camera, scene, renderer, controls;
let reticle, current_object;

let hitTestSource = null;
let hitTestSourceRequested = false;

let selected_model = "1";
let placed_objects = [];

var touchDown, touchX, touchY, deltaX, deltaY;

init();


function init() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
    );

    camera.position.z = 2;


    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    document.body.appendChild(renderer.domElement);


    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, -0.2);
    controls.enableDamping = true;


    scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3));


    // RETICLE

    let geometry = new THREE.RingGeometry(0.15, 0.20, 32);

    geometry.rotateX(-Math.PI / 2);

    reticle = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );

    reticle.matrixAutoUpdate = false;
    reticle.visible = false;

    scene.add(reticle);


    // AR

    let options = {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay']
    };

    options.domOverlay = {
        root: document.getElementById('content')
    };

    document.body.appendChild(
        ARButton.createButton(renderer, options)
    );


    // ROTATION - CODE DU TD

    renderer.domElement.addEventListener('touchstart', function(e) {

        e.preventDefault();

        touchDown = true;

        touchX = e.touches[0].pageX;
        touchY = e.touches[0].pageY;

    }, false);


    renderer.domElement.addEventListener('touchend', function(e) {

        e.preventDefault();

        touchDown = false;

    }, false);


    renderer.domElement.addEventListener('touchmove', function(e) {

        e.preventDefault();

        if (!touchDown) {
            return;
        }

        deltaX = e.touches[0].pageX - touchX;
        deltaY = e.touches[0].pageY - touchY;

        touchX = e.touches[0].pageX;
        touchY = e.touches[0].pageY;

        rotateObject();

    }, false);


    window.addEventListener('resize', onWindowResize);

    loadModel("1");

    renderer.setAnimationLoop(render);
}


// CHARGER UNE CHAISE

function loadModel(model) {

    if (current_object) {
        scene.remove(current_object);
    }

    new GLTFLoader().load(

        './model/' + model + '.glb',

        function(gltf) {

            current_object = gltf.scene;

            scene.add(current_object);

            current_object.position.set(0, 0, -2);

            if (renderer.xr.isPresenting) {
                current_object.visible = false;
            }

        }

    );
}


// MENU

$('.ar-object').click(function(e) {

    e.preventDefault();

    selected_model = $(this).attr("id");

    loadModel(selected_model);

    closeNav();

});


// ROTATION DU TD

function rotateObject() {

    if (current_object && reticle.visible) {

        current_object.rotation.y += deltaX / 100;

    }

}


// PLACE

$("#place-button").click(function() {

    if (!current_object || !reticle.visible) {
        return;
    }

    current_object.position.setFromMatrixPosition(
        reticle.matrix
    );

    current_object.visible = true;

    placed_objects.push(current_object);

    current_object = null;

    loadModel(selected_model);

});


// DELETE = DERNIERE CHAISE

$("#delete-button").click(function() {

    if (placed_objects.length === 0) {
        return;
    }

    let object = placed_objects.pop();

    scene.remove(object);

});


// CLEAR = TOUT SUPPRIMER

$("#clear-button").click(function() {

    placed_objects.forEach(function(object) {

        scene.remove(object);

    });

    placed_objects = [];

});


// HIT TEST

function render(timestamp, frame) {

    if (!frame) {

        controls.update();

        renderer.render(scene, camera);

        return;
    }


    let referenceSpace = renderer.xr.getReferenceSpace();
    let session = renderer.xr.getSession();


    if (!hitTestSourceRequested) {

        session.requestReferenceSpace('viewer')

        .then(function(viewerSpace) {

            return session.requestHitTestSource({
                space: viewerSpace
            });

        })

        .then(function(source) {

            hitTestSource = source;

        });


        hitTestSourceRequested = true;

    }


    if (hitTestSource) {

        let results = frame.getHitTestResults(hitTestSource);


        if (results.length) {

            let hit = results[0];

            reticle.visible = true;

            reticle.matrix.fromArray(
                hit.getPose(referenceSpace).transform.matrix
            );

            document.getElementById(
                "place-button"
            ).style.display = "block";


            // Objet en attente suit le cercle

            if (current_object) {

                current_object.position.setFromMatrixPosition(
                    reticle.matrix
                );

                current_object.visible = true;

            }

        }

        else {

            reticle.visible = false;

            document.getElementById(
                "place-button"
            ).style.display = "none";

        }

    }


    renderer.render(scene, camera);

}


// RESIZE DU TD

function onWindowResize() {

    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

}