import * as THREE from 'three';

import {
    ARButton
} from 'three/addons/webxr/ARButton.js';

import {
    GLTFLoader
} from 'three/addons/webxr/GLTFLoader.js';

import {
    OrbitControls
} from 'three/addons/webxr/OrbitControls.js';



/* =========================================
   VARIABLES
========================================= */

let scene;
let camera;
let renderer;
let controls;

let reticle;

let hitTestSource = null;
let hitTestSourceRequested = false;


/* Objet actuellement prêt à être placé */
let current_object = null;


/* Modèle sélectionné dans le menu */
let selected_model = '1';


/* Permet d'éviter les conflits de chargement */
let loading_model = null;


/* Tous les objets réellement placés */
let placed_objects = [];



/* =========================================
   INITIALISATION
========================================= */

init();



function init() {


    /* -------------------------------------
       SCENE
    ------------------------------------- */

    scene = new THREE.Scene();



    /* -------------------------------------
       CAMERA
    ------------------------------------- */

    camera = new THREE.PerspectiveCamera(

        70,

        window.innerWidth /
        window.innerHeight,

        0.01,

        20
    );


    camera.position.set(
        0,
        0,
        2
    );



    /* -------------------------------------
       LUMIERES
    ------------------------------------- */

    const directionalLight =
        new THREE.DirectionalLight(
            0xffffff,
            2
        );

    directionalLight.position.set(
        1,
        2,
        1
    );

    scene.add(
        directionalLight
    );


    const ambientLight =
        new THREE.AmbientLight(
            0xffffff,
            1
        );

    scene.add(
        ambientLight
    );



    /* -------------------------------------
       RENDERER
    ------------------------------------- */

    renderer =
        new THREE.WebGLRenderer({

            antialias: true,

            alpha: true
        });


    renderer.setPixelRatio(
        window.devicePixelRatio
    );


    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );


    renderer.xr.enabled = true;


    document.body.appendChild(
        renderer.domElement
    );



    /* -------------------------------------
       ORBIT CONTROLS
    ------------------------------------- */

    controls =
        new OrbitControls(
            camera,
            renderer.domElement
        );


    controls.target.set(
        0,
        0,
        0
    );


    controls.enableDamping = true;

    controls.dampingFactor = 0.05;

    controls.update();



    /* -------------------------------------
       RETICLE
    ------------------------------------- */

    const geometry =
        new THREE.RingGeometry(
            0.15,
            0.20,
            32
        );


    geometry.rotateX(
        -Math.PI / 2
    );


    const material =
        new THREE.MeshBasicMaterial({

            color: 0xffffff
        });


    reticle =
        new THREE.Mesh(
            geometry,
            material
        );


    reticle.matrixAutoUpdate = false;

    reticle.visible = false;


    scene.add(
        reticle
    );



    /* -------------------------------------
       CONFIGURATION AR
    ------------------------------------- */

    const options = {

        requiredFeatures: [
            'hit-test'
        ],

        optionalFeatures: [
            'dom-overlay'
        ],

        domOverlay: {

            root:
                document.getElementById(
                    'content'
                )
        }
    };


    document.body.appendChild(

        ARButton.createButton(
            renderer,
            options
        )

    );



    /* -------------------------------------
       DEBUT SESSION AR
    ------------------------------------- */

    renderer.xr.addEventListener(

        'sessionstart',

        function () {


            hitTestSource = null;

            hitTestSourceRequested = false;

            reticle.visible = false;


            controls.enabled = false;


            /*
             On cache l'objet de prévisualisation.
             Il apparaîtra au moment du placement.
            */

            if (current_object) {

                current_object.visible = false;
            }

        }
    );



    /* -------------------------------------
       FIN SESSION AR
    ------------------------------------- */

    renderer.xr.addEventListener(

        'sessionend',

        function () {


            hitTestSource = null;

            hitTestSourceRequested = false;

            reticle.visible = false;


            controls.enabled = true;


            document.getElementById(
                'place-button'
            ).style.display = 'none';


            /*
             Si un objet était en attente,
             on le réaffiche dans la vue normale.
            */

            if (current_object) {

                current_object.visible = true;

                current_object.position.set(
                    0,
                    0,
                    0
                );
            }

        }
    );



    /* -------------------------------------
       REDIMENSIONNEMENT
    ------------------------------------- */

    window.addEventListener(

        'resize',

        onWindowResize

    );



    /* -------------------------------------
       MODELE PAR DEFAUT
    ------------------------------------- */

    loadModel(
        selected_model
    );



    /* -------------------------------------
       BOUCLE
    ------------------------------------- */

    renderer.setAnimationLoop(
        animate
    );

}



/* =========================================
   CHARGEMENT D'UN MODELE
========================================= */

function loadModel(model) {


    loading_model = model;

    selected_model = model;


    const loader =
        new GLTFLoader();


    loader.load(

        './model/' +
        model +
        '.glb',


        function (gltf) {


            /*
             Si l'utilisateur a sélectionné
             un autre modèle entre temps,
             on ignore celui-ci.
            */

            if (
                loading_model !== model
            ) {

                return;
            }



            /*
             Supprime uniquement l'objet
             qui n'a pas encore été placé.
            */

            if (current_object) {

                scene.remove(
                    current_object
                );
            }



            current_object =
                gltf.scene;



            /*
             Centre le modèle sur son origine.
            */

            const box =
                new THREE.Box3()
                    .setFromObject(
                        current_object
                    );


            const center =
                box.getCenter(
                    new THREE.Vector3()
                );


            current_object.position.sub(
                center
            );



            /*
             Position normale avant AR.
            */

            current_object.position.set(
                0,
                0,
                0
            );



            scene.add(
                current_object
            );



            /*
             En AR, l'objet attend d'être placé.
            */

            if (
                renderer.xr.isPresenting
            ) {

                current_object.visible = false;

            } else {

                current_object.visible = true;
            }


        },


        undefined,


        function (error) {


            console.error(

                'Erreur lors du chargement de ' +
                model +
                '.glb',

                error
            );

        }

    );

}



/* =========================================
   SELECTION D'UN MODELE DANS LE MENU
========================================= */

$('.ar-object').click(

    function (event) {


        event.preventDefault();

        event.stopPropagation();


        const model =
            $(this).attr(
                'id'
            );


        selected_model = model;


        loadModel(
            model
        );


        closeNav();

    }

);



/* =========================================
   PLACE
========================================= */

$('#place-button').click(

    function (event) {


        event.preventDefault();

        event.stopPropagation();


        placeObject();

    }

);



function placeObject() {


    /*
     Il faut :
     - un objet
     - une surface détectée
    */

    if (
        !current_object ||
        !reticle.visible
    ) {

        return;
    }



    /*
     Place l'objet exactement
     sur le reticle.
    */

    current_object.position
        .setFromMatrixPosition(
            reticle.matrix
        );


    current_object.visible = true;



    /*
     L'objet devient définitivement
     un objet placé.
    */

    placed_objects.push(
        current_object
    );



    /*
     Il n'est donc plus l'objet courant.
    */

    current_object = null;



    /*
     Charge une nouvelle copie du même
     modèle afin de pouvoir en placer
     un autre.
    */

    loadModel(
        selected_model
    );

}



/* =========================================
   DELETE
   Supprime le DERNIER objet placé
========================================= */

$('#delete-button').click(

    function (event) {


        event.preventDefault();

        event.stopPropagation();


        /*
         Aucun objet placé.
        */

        if (
            placed_objects.length === 0
        ) {

            console.log(
                'Aucun objet à supprimer.'
            );

            return;
        }



        /*
         Récupère le dernier objet placé.
        */

        const objectToDelete =
            placed_objects.pop();



        /*
         Le retire de la scène.
        */

        scene.remove(
            objectToDelete
        );



        /*
         Libération des géométries
         et matériaux.
        */

        disposeObject(
            objectToDelete
        );

    }

);



/* =========================================
   CLEAR
   Supprime TOUS les objets placés
========================================= */

$('#clear-button').click(

    function (event) {


        event.preventDefault();

        event.stopPropagation();



        placed_objects.forEach(

            function (object) {


                scene.remove(
                    object
                );


                disposeObject(
                    object
                );

            }

        );



        /*
         Vide complètement le tableau.
        */

        placed_objects = [];


        console.log(
            'Tous les objets ont été supprimés.'
        );

    }

);



/* =========================================
   LIBERATION MEMOIRE
========================================= */

function disposeObject(object) {


    object.traverse(

        function (child) {


            if (child.geometry) {

                child.geometry.dispose();
            }



            if (child.material) {


                if (
                    Array.isArray(
                        child.material
                    )
                ) {


                    child.material.forEach(

                        function (material) {

                            material.dispose();

                        }

                    );


                } else {


                    child.material.dispose();

                }

            }

        }

    );

}



/* =========================================
   HIT TEST + ANIMATION
========================================= */

function animate(
    timestamp,
    frame
) {


    /*
     OrbitControls uniquement
     hors AR.
    */

    if (
        !renderer.xr.isPresenting
    ) {

        controls.update();
    }



    /*
     Pas encore en AR.
    */

    if (!frame) {


        renderer.render(
            scene,
            camera
        );


        return;
    }



    const referenceSpace =
        renderer.xr.getReferenceSpace();


    const session =
        renderer.xr.getSession();



    /* -------------------------------------
       CREATION HIT TEST
    ------------------------------------- */

    if (
        !hitTestSourceRequested
    ) {


        hitTestSourceRequested = true;


        session
            .requestReferenceSpace(
                'viewer'
            )

            .then(

                function (
                    viewerSpace
                ) {


                    return session
                        .requestHitTestSource({

                            space:
                                viewerSpace
                        });

                }

            )

            .then(

                function (
                    source
                ) {


                    hitTestSource =
                        source;

                }

            )

            .catch(

                function (
                    error
                ) {


                    console.error(
                        'Erreur Hit Test :',
                        error
                    );


                    hitTestSourceRequested =
                        false;

                }

            );

    }



    /* -------------------------------------
       RESULTAT HIT TEST
    ------------------------------------- */

    if (hitTestSource) {


        const hitTestResults =
            frame.getHitTestResults(
                hitTestSource
            );



        if (
            hitTestResults.length > 0
        ) {


            const hit =
                hitTestResults[0];


            const pose =
                hit.getPose(
                    referenceSpace
                );



            if (pose) {


                reticle.visible =
                    true;


                reticle.matrix
                    .fromArray(
                        pose.transform.matrix
                    );



                /*
                 PLACE apparaît seulement
                 quand une surface est trouvée.
                */

                document.getElementById(
                    'place-button'
                ).style.display =
                    'block';

            }


        } else {


            reticle.visible =
                false;


            document.getElementById(
                'place-button'
            ).style.display =
                'none';

        }

    }



    renderer.render(
        scene,
        camera
    );

}



/* =========================================
   RESIZE
========================================= */

function onWindowResize() {


    camera.aspect =
        window.innerWidth /
        window.innerHeight;


    camera.updateProjectionMatrix();



    if (
        !renderer.xr.isPresenting
    ) {


        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

    }

}