import * as THREE from 'three';

const checkpoints = [
    new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),    // CP0
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 50),    // CP1
    new THREE.Plane(new THREE.Vector3(0, 0, 1), 100),   // CP2
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), 50),   // CP3
];

let currentCheckpoint = {};
let lapCount = {};

export function updatePlayer(player, id) {
    const cpIndex = currentCheckpoint[id] || 0;
    const plane = checkpoints[cpIndex];
    const dist = plane.distanceToPoint(player.position);
    const side = dist > 0 ? 1 : -1;

    // Store last side for crossing detection
    player.lastSide ??= [];
    if (player.lastSide[cpIndex] !== undefined && side !== player.lastSide[cpIndex]) {
        // Crossed this checkpoint plane
        const forward = plane.normal.dot(player.velocity.clone().normalize()) > 0.1;
        if (forward) {
            currentCheckpoint[id] = (cpIndex + 1) % checkpoints.length;

            if (currentCheckpoint[id] === 0) {
                lapCount[id] = (lapCount[id] || 0) + 1;
                console.log(`Player ${id} completed lap ${lapCount[id]}`);
            }
        }
    }
    player.lastSide[cpIndex] = side;
}
