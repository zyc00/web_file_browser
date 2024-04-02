import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";

var viewer = null;
var geometry, points, scene;
var geometry_origin, points_origin, scene_origin;

function createLights() {
    const ambientLight = new THREE.AmbientLight("white", 2);
  
    const mainLight = new THREE.DirectionalLight("white", 5);
    mainLight.position.set(10, 10, 10);
  
    return { ambientLight, mainLight };
}

async function loadPointCloud(ply_path) {
    console.log("Loading point cloud:", ply_path);
    var response = await fetch(ply_path);
    var data = await response.json();
    var positions = data.xyz;
    var colors = data.rgb;
    var material = new THREE.PointsMaterial({
      size: 10,
      vertexColors: true,
    });
  
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  
    points = new THREE.Points(geometry, material);
    scene.add(points);
}

async function loadPointCloudOrigin(ply_path) {
    console.log("Loading point cloud:", ply_path);
    var response = await fetch(ply_path);
    var data = await response.json();
    var positions = data.xyz;
    var colors = data.rgb;
    var material = new THREE.PointsMaterial({
      size: 10,
      vertexColors: true,
    });
  
    geometry_origin = new THREE.BufferGeometry();
    geometry_origin.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry_origin.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  
    points_origin = new THREE.Points(geometry_origin, material);
    scene_origin.add(points_origin);
}

function syncControls(controls, controls_origin) {
    // Sync controls
    controls.addEventListener('change', () => {
        controls_origin.target.copy(controls.target);
        controls_origin.object.position.copy(controls.object.position);
        controls_origin.object.zoom = controls.object.zoom;
        controls_origin.object.quaternion.copy(controls.object.quaternion);
    });

    controls_origin.addEventListener('change', () => {
        controls.target.copy(controls_origin.target);
        controls.object.position.copy(controls_origin.object.position);
        controls.object.zoom = controls_origin.object.zoom;
        controls.object.quaternion.copy(controls_origin.object.quaternion);
    });
}

function fetchDirectory(path) {
    fetch(`/files?path=${path}`)
        .then(response => response.json())
        .then(data => {
            const directoryStructure = document.getElementById('directory-structure');
            directoryStructure.innerHTML = ''; // Clear previous content
            [...data.directories, ...data.files].forEach(item => {
                const div = document.createElement('div');
                div.textContent = item;
                div.onclick = () => {
                    if (data.directories.includes(item)) {
                        // If item is a directory, fetch its contents
                        fetchDirectory(`${path}/${item}`);
                    } else {
                        if (['.ply'].some(ext => item.endsWith(ext))) {
                            console.log('Loading point cloud:', item);
                            scene = new THREE.Scene();

                            // Initialize variables
                            var canvas = document.getElementById("viewer");

                            var canvas_width = canvas.getBoundingClientRect().width;
                            var canvas_height = canvas.getBoundingClientRect().height;

                            // Initialize camera
                            var camera = new THREE.OrthographicCamera(
                                canvas_width / -800, // Left
                                canvas_width / 800, // Right
                                canvas_height / 800, // Top
                                canvas_height / -800, // Bottom
                                1, // Near
                                1000 // Far
                            );
                            camera.position.z = 5;

                            // Initialize renderer
                            var renderer = new THREE.WebGLRenderer({
                                canvas: canvas,
                                antialias: true,
                            });
                            renderer.setSize(canvas_width, canvas_height);
                            
                            // Initialize controls
                            var controls = new TrackballControls(camera, renderer.domElement);
                            controls.enableDamping = true;
                            controls.dampingFactor = 0.25;
                            controls.enableZoom = true;

                            // Load point cloud
                            loadPointCloud(`/pointcloud/${path}/${item}`).then(() => {
                                function animate() {
                                    requestAnimationFrame(animate);
                                    renderer.render(scene, camera);
                                    controls.update();
                                }
                                animate();
                            });


                            // load fused point cloud
                            // console.log('Loading point cloud:', item);
                            // scene_origin = new THREE.Scene();

                            // // Initialize variables
                            // var canvas_origin = document.getElementById("origin-viewer");
                            // var canvas_width_origin = canvas_origin.getBoundingClientRect().width;
                            // var canvas_height_origin = canvas_origin.getBoundingClientRect().height;

                            // // Initialize renderer
                            // var renderer_origin = new THREE.WebGLRenderer({
                            //     canvas: canvas_origin,
                            //     antialias: true,
                            // });
                            // renderer_origin.setSize(canvas_width_origin, canvas_height_origin);

                            // // Load point cloud
                            // console.log(`/pointcloud/${path}/${item}`)
                            // path.replace("pseudo_masks", "fused_rgb.ply")
                            // loadPointCloudOrigin(`/pointcloud/${path.replace("pseudo_masks", "fused_rgb.ply")}`).then(() => {
                            //     function animate_origin() {
                            //         requestAnimationFrame(animate_origin);
                            //         renderer_origin.render(scene_origin, camera);
                            //         controls_origin.update();
                            //     }
                            //     animate_origin();
                            // });
                        } else if (!['.obj', '.stl', '.glb'].some(ext => item.endsWith(ext))) {
                            // If item is a file, display a simple preview
                            document.getElementById('preview').textContent = `Selected file: ${item}`;
                        } else {
                            // get the parent element of the viewer
                            let parentDiv = document.getElementById('preview');

                            // initialize the viewer with the parent element and some parameters
                            if (viewer === null) {
                                viewer = new OV.EmbeddedViewer(parentDiv, {
                                    camera: new OV.Camera(
                                        new OV.Coord3D(-1.5, 2.0, 3.0),
                                        new OV.Coord3D(0.0, 0.0, 0.0),
                                        new OV.Coord3D(0.0, 1.0, 0.0),
                                        45.0
                                    ),
                                    backgroundColor: new OV.RGBAColor(255, 255, 255, 255),
                                    defaultColor: new OV.RGBColor(200, 200, 200),
                                    edgeSettings: new OV.EdgeSettings(false, new OV.RGBColor(0, 0, 0), 1),
                                    environmentSettings: new OV.EnvironmentSettings(
                                        [
                                            '/static/o3dv/envmaps/fishermans_bastion/posx.jpg',
                                            '/static/o3dv/envmaps/fishermans_bastion/negx.jpg',
                                            '/static/o3dv/envmaps/fishermans_bastion/posy.jpg',
                                            '/static/o3dv/envmaps/fishermans_bastion/negy.jpg',
                                            '/static/o3dv/envmaps/fishermans_bastion/posz.jpg',
                                            '/static/o3dv/envmaps/fishermans_bastion/negz.jpg'
                                        ],
                                        true
                                    )
                                });
                            }

                            // load a model providing model urls
                            viewer.LoadModelFromUrlList([
                                `/file/${path}/${item}`
                            ]);
                        }
                    }
                };
                directoryStructure.appendChild(div);
            });
        })
        .catch(error => console.error('Error fetching directory:', error));
}

fetchDirectory("."); // Fetch root directory on initial load
