import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("scene");
const missionEl = document.getElementById("mission");
const objectiveEl = document.getElementById("objective");
const statusEl = document.getElementById("status");
const ammoEl = document.getElementById("ammo");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("start");

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x091021, 80, 340);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 550);
camera.position.set(0, 3, 12);

scene.background = new THREE.Color(0x070e21);

const hemi = new THREE.HemisphereLight(0x8ab7ff, 0x102233, 1);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2d1, 1.4);
sun.position.set(30, 90, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(460, 460),
  new THREE.MeshStandardMaterial({ color: 0x1b2535, roughness: 0.92, metalness: 0.08 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 420),
  new THREE.MeshStandardMaterial({ color: 0x141921, roughness: 0.74, metalness: 0.15 })
);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.02;
scene.add(road);

const buildings = [];
for (let i = 0; i < 110; i += 1) {
  const width = THREE.MathUtils.randFloat(6, 14);
  const height = THREE.MathUtils.randFloat(14, 55);
  const depth = THREE.MathUtils.randFloat(6, 14);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.56 + Math.random() * 0.08, 0.2, 0.13 + Math.random() * 0.08),
      roughness: 0.52,
      metalness: 0.25,
      emissive: 0x0a1018,
      emissiveIntensity: 0.25,
    })
  );

  const side = Math.random() > 0.5 ? 1 : -1;
  mesh.position.set(
    side * THREE.MathUtils.randFloat(16, 90),
    height / 2,
    THREE.MathUtils.randFloatSpread(390)
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  buildings.push(mesh);
}

const player = {
  position: new THREE.Vector3(0, 1.7, 30),
  velocity: new THREE.Vector3(),
  yaw: Math.PI,
  pitch: -0.04,
  hp: 100,
  ammo: 100,
};

const keys = {};
let running = false;

const enemies = [];
function spawnEnemy(pos) {
  const enemy = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.65, 1.1, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xff4f5f, emissive: 0x2d0008, roughness: 0.55 })
  );
  enemy.position.copy(pos);
  enemy.castShadow = true;
  enemy.userData.hp = 3;
  scene.add(enemy);
  enemies.push(enemy);
}

spawnEnemy(new THREE.Vector3(8, 1, -25));
spawnEnemy(new THREE.Vector3(-10, 1, -38));
spawnEnemy(new THREE.Vector3(5, 1, -58));
spawnEnemy(new THREE.Vector3(2, 1, -90));

const checkpoints = [
  new THREE.Vector3(0, 0.2, -15),
  new THREE.Vector3(-7, 0.2, -52),
  new THREE.Vector3(4, 0.2, -100),
];

const checkpointMeshes = checkpoints.map((point) => {
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 0.25, 24),
    new THREE.MeshBasicMaterial({ color: 0x4df4ff })
  );
  marker.position.copy(point);
  scene.add(marker);
  return marker;
});

const missions = [
  {
    name: "Reconocimiento Urbano",
    objective: "Llega al primer punto de escaneo.",
    done: () => player.position.distanceTo(checkpoints[0]) < 2.5,
  },
  {
    name: "Limpieza de Distrito",
    objective: "Neutraliza 3 drones hostiles con tu arma de pulso.",
    done: () => enemies.filter((enemy) => enemy.userData.hp > 0).length <= 1,
  },
  {
    name: "Entrega de Datos",
    objective: "Lleva los datos al último nodo del distrito.",
    done: () => player.position.distanceTo(checkpoints[2]) < 2.5,
  },
];

let missionIndex = 0;

function updateMissionUI() {
  if (missionIndex >= missions.length) {
    missionEl.textContent = "Misión: campaña completada";
    objectiveEl.textContent = "Objetivo: Eres leyenda del distrito.";
    return;
  }
  missionEl.textContent = `Misión: ${missions[missionIndex].name}`;
  objectiveEl.textContent = `Objetivo: ${missions[missionIndex].objective}`;
}

function updateHUD() {
  statusEl.textContent = `Estado: ${player.hp > 0 ? "vivo" : "caído"}`;
  ammoEl.textContent = `Energía de arma: ${Math.round(player.ammo)}`;
}

function updateCamera() {
  camera.position.copy(player.position);
  const direction = new THREE.Vector3(
    Math.sin(player.yaw) * Math.cos(player.pitch),
    Math.sin(player.pitch),
    Math.cos(player.yaw) * Math.cos(player.pitch)
  );
  camera.lookAt(player.position.clone().add(direction));
}

function movePlayer(dt) {
  const speed = keys.ShiftLeft ? 20 : 12;
  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  const input = new THREE.Vector3();
  if (keys.KeyW) input.add(forward);
  if (keys.KeyS) input.sub(forward);
  if (keys.KeyA) input.sub(right);
  if (keys.KeyD) input.add(right);

  if (input.lengthSq() > 0) {
    input.normalize().multiplyScalar(speed * dt);
    player.position.add(input);
  }

  player.position.x = THREE.MathUtils.clamp(player.position.x, -95, 95);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -205, 205);
}

function fire() {
  if (!running || player.ammo <= 1 || player.hp <= 0) return;
  player.ammo -= 1;

  const origin = player.position.clone();
  const direction = new THREE.Vector3(
    Math.sin(player.yaw) * Math.cos(player.pitch),
    Math.sin(player.pitch),
    Math.cos(player.yaw) * Math.cos(player.pitch)
  ).normalize();

  const raycaster = new THREE.Raycaster(origin, direction, 0, 120);
  const hits = raycaster.intersectObjects(enemies.filter((enemy) => enemy.userData.hp > 0));

  if (hits.length > 0) {
    const target = hits[0].object;
    target.userData.hp -= 1;
    target.material.emissive = new THREE.Color(0x550000);
    target.scale.y = 1 + Math.max(target.userData.hp, 0) * 0.08;

    if (target.userData.hp <= 0) {
      target.visible = false;
      target.position.y = -10;
    }
  }

  updateHUD();
}

window.addEventListener("keydown", (event) => {
  keys[event.code] = true;

  if (event.code === "KeyE" && !running) {
    overlay.style.display = "none";
    running = true;
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

window.addEventListener("mousemove", (event) => {
  if (!running) return;
  player.yaw -= event.movementX * 0.0024;
  player.pitch -= event.movementY * 0.0018;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.1, 1.1);
});

window.addEventListener("mousedown", fire);
startBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  running = true;
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  const dt = clock.getDelta();

  if (running && player.hp > 0) {
    movePlayer(dt);

    enemies.forEach((enemy) => {
      if (enemy.userData.hp <= 0) return;
      const toPlayer = player.position.clone().sub(enemy.position);
      const dist = toPlayer.length();

      if (dist < 40) {
        enemy.position.add(toPlayer.normalize().multiplyScalar(dt * 2.2));
      }

      if (dist < 1.7) {
        player.hp -= dt * 12;
        if (player.hp <= 0) {
          player.hp = 0;
          overlay.style.display = "grid";
          overlay.innerHTML = "<h2>Has caído. Reinicia la página para volver.</h2>";
          running = false;
        }
      }
    });

    if (missionIndex < missions.length && missions[missionIndex].done()) {
      missionIndex += 1;
      updateMissionUI();
    }

    checkpointMeshes.forEach((mesh, index) => {
      mesh.visible = index >= missionIndex - 1;
      mesh.rotation.y += dt * 1.7;
    });

    player.ammo = Math.min(player.ammo + dt * 4.5, 100);
  }

  updateHUD();
  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateMissionUI();
updateHUD();
updateCamera();
animate();
