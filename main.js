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


/* OBJET ACTUEL */
let current_object = null;


/* MODELE SELECTIONNE */
let selected_model = '1';


/* CHARGEMENT */
let loading_model = null;


/* OBJETS DEJA PLACES */
let placed_objects = [];


/* =========================================
   VARIABLES ROTATION DU TD
========================================= */

var touchDown;
var touchX;
var touchY;
var deltaX;
var deltaY;



/* =========================================
   INITIALISATION
========================================= */

init();



function init() {


    /* =====================================
       SCENE
    ===================================== */

    scene = new THREE.Scene();



    /* =====================================
       CAMERA
    ===================================== */

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



    /* =====================================
       LUMIERES
    ===================================== */

    var directionalLight =
        new THREE.DirectionalLight(
            0xdddddd,
            1
        );


    directionalLight.position
        .set(
            0,
            0,
            1
        )
        .normalize();


    scene.add(
        directionalLight
    );


    var ambientLight =
        new THREE.AmbientLight(
            0x222222
        );


    scene.add(
        ambientLight
    );



    /* =====================================
       RENDERER
    ===================================== */

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



    /* =====================================
       ROTATION TACTILE
       CODE DU TD
    ===================================== */

    renderer.domElement.addEventListener(
        'touchstart',

        function(e){

            e.preventDefault();

            touchDown = true;

            touchX =
                e.touches[0].pageX;

            touchY =
                e.touches[0].pageY;

        },

        false
    );


    renderer.domElement.addEventListener(
        'touchend',

        function(e){

            e.preventDefault();

            touchDown = false;

        },

        false
    );


    renderer.domElement.addEventListener(
        'touchmove',

        function(e){

            e.preventDefault();


            if(!touchDown){

                return;

            }


            deltaX =
                e.touches[0].pageX -
                touchX;


            deltaY =
                e.touches[0].pageY -
                touchY;


            touchX =
                e.touches[0].pageX;


            touchY =
                e.touches[0].pageY;


            rotateObject();

        },

        false
    );



    /* =====================================
       ORBIT CONTROLS
    ===================================== */

    controls =
        new OrbitControls(
            camera,
            renderer.domElement
        );


    controls.minDistance = 2;

    controls.maxDistance = 10;


    controls.target.set(
        0,
        0,
        -0.2
    );


    controls.enableDamping = true;

    controls.dampingFactor = 0.05;


    controls.update();



    /* =====================================
       RETICLE
    ===================================== */

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



    /* =====================================
       CONFIGURATION AR
    ===================================== */

    let options = {

        requiredFeatures: [
            'hit-test'
        ],

        optionalFeatures: [
            'dom-overlay'
        ]

    };


    options.domOverlay = {

        root:
            document.getElementById(
                'content'
            )

    };


    document.body.appendChild(

        ARButton.createButton(
            renderer,
            options
        )

    );



    /* =====================================
       DEBUT SESSION AR
    ===================================== */

    renderer.xr.addEventListener(

        'sessionstart',

        function () {


            hitTestSource = null;

            hitTestSourceRequested = false;

            reticle.visible = false;


            controls.enabled = false;


            if(current_object){

                current_object.visible =
                    false;

            }

        }

    );



    /* =====================================
       FIN SESSION AR
    ===================================== */

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


            if(current_object){

                current_object.visible =
                    true;


                current_object.position.set(
                    0,
                    0,
                    0
                );

            }

        }

    );



    /* =====================================
       RESIZE
    ===================================== */

    window.addEventListener(

        'resize',

        onWindowResize

    );



    /* =====================================
       MODELE PAR DEFAUT
    ===================================== */

    loadModel(
        selected_model
    );



    /* =====================================
       ANIMATION
    ===================================== */

    renderer.setAnimationLoop(
        animate
    );

}



/* =========================================
   CHARGEMENT MODELE
========================================= */

function loadModel(model){


    loading_model = model;

    selected_model = model;


    var loader =
        new GLTFLoader();


    loader.load(

        './model/' +
        model +
        '.glb',


        function(gltf){


            if(
                loading_model !== model
            ){

                return;

            }



            /* Supprime uniquement
               l'objet pas encore placé */

            if(current_object){

                scene.remove(
                    current_object
                );

            }



            current_object =
                gltf.scene;



            /* =================================
               CENTRAGE OBJET
            ================================= */

            var box =
                new THREE.Box3();


            box.setFromObject(
                current_object
            );


            var center =
                box.getCenter(
                    new THREE.Vector3()
                );


            current_object.position.sub(
                center
            );



            /* =================================
               POSITION INITIALE
            ================================= */

            current_object.position.set(
                0,
                0,
                0
            );



            scene.add(
                current_object
            );



            /* En AR l'objet est caché
               avant son placement */

            if(
                renderer.xr.isPresenting
            ){

                current_object.visible =
                    false;

            }

            else{

                current_object.visible =
                    true;

            }


        },


        undefined,


        function(error){


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
   SELECTION OBJET MENU
========================================= */

$('.ar-object').click(

    function(event){


        event.preventDefault();

        event.stopPropagation();


        var model =
            $(this).attr(
                'id'
            );


        selected_model =
            model;


        loadModel(
            model
        );


        closeNav();

    }

);



/* =========================================
   ROTATION OBJET
   CODE DU TD
========================================= */

function rotateObject(){


    if(
        current_object &&
        reticle.visible
    ){


        current_object.rotation.y +=
            deltaX / 100;


    }

}



/* =========================================
   PLACE
========================================= */

$('#place-button').click(

    function(event){


        event.preventDefault();

        event.stopPropagation();


        placeObject();

    }

);



function placeObject(){


    if(
        !current_object ||
        !reticle.visible
    ){

        return;

    }



    /* Positionne l'objet
       sur le cercle */

    current_object.position
        .setFromMatrixPosition(
            reticle.matrix
        );


    current_object.visible =
        true;



    /* Ajoute l'objet à la liste */

    placed_objects.push(
        current_object
    );



    /* L'objet vient d'être placé */

    current_object = null;



    /* Recharge le même modèle
       pour pouvoir en placer
       un autre */

    loadModel(
        selected_model
    );

}



/* =========================================
   DELETE
   SUPPRIME LE DERNIER OBJET PLACE
========================================= */

$('#delete-button').click(

    function(event){


        event.preventDefault();

        event.stopPropagation();



        if(
            placed_objects.length === 0
        ){

            console.log(
                'Aucun objet à supprimer'
            );

            return;

        }



        var objectToDelete =
            placed_objects.pop();



        scene.remove(
            objectToDelete
        );


        disposeObject(
            objectToDelete
        );

    }

);



/* =========================================
   CLEAR
   SUPPRIME TOUS LES OBJETS
========================================= */

$('#clear-button').click(

    function(event){


        event.preventDefault();

        event.stopPropagation();



        placed_objects.forEach(

            function(object){


                scene.remove(
                    object
                );


                disposeObject(
                    object
                );

            }

        );



        placed_objects = [];


        console.log(
            'Tous les objets ont été supprimés'
        );

    }

);



/* =========================================
   LIBERATION MEMOIRE
========================================= */

function disposeObject(object){


    object.traverse(

        function(child){


            if(child.geometry){

                child.geometry.dispose();

            }


            if(child.material){


                if(
                    Array.isArray(
                        child.material
                    )
                ){


                    child.material.forEach(

                        function(material){

                            material.dispose();

                        }

                    );


                }

                else{


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
){



    /* OrbitControls hors AR */

    if(
        !renderer.xr.isPresenting
    ){

        controls.update();

    }



    /* Pas en AR */

    if(!frame){


        renderer.render(
            scene,
            camera
        );


        return;

    }



    var referenceSpace =
        renderer.xr.getReferenceSpace();


    var session =
        renderer.xr.getSession();



    /* =====================================
       CREATION HIT TEST
    ===================================== */

    if(
        !hitTestSourceRequested
    ){


        hitTestSourceRequested =
            true;



        session
            .requestReferenceSpace(
                'viewer'
            )

            .then(

                function(
                    viewerSpace
                ){


                    return session
                        .requestHitTestSource({

                            space:
                                viewerSpace

                        });

                }

            )

            .then(

                function(source){


                    hitTestSource =
                        source;

                }

            )

            .catch(

                function(error){


                    console.error(
                        'Erreur Hit Test :',
                        error
                    );


                    hitTestSourceRequested =
                        false;

                }

            );

    }



    /* =====================================
       RESULTATS HIT TEST
    ===================================== */

    if(hitTestSource){


        var hitTestResults =
            frame.getHitTestResults(
                hitTestSource
            );



        if(
            hitTestResults.length > 0
        ){


            var hit =
                hitTestResults[0];


            var pose =
                hit.getPose(
                    referenceSpace
                );



            if(pose){


                reticle.visible =
                    true;


                reticle.matrix
                    .fromArray(
                        pose.transform.matrix
                    );


                document.getElementById(
                    'place-button'
                ).style.display =
                    'block';

            }


        }

        else{


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
   REDIMENSIONNEMENT
   CODE DU TD
========================================= */

function onWindowResize(){


    camera.aspect =
        window.innerWidth /
        window.innerHeight;


    camera.updateProjectionMatrix();


    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

}