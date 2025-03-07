const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

const canvasName = "s3canvas";
const canvas = document.getElementById(canvasName);
const gl = canvas.getContext("webgl2", {
    alpha: false // treats the html canvas as if it has no alpha component. webgl rendering will handle all transparency
});

const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;
const quat = glMatrix.quat;

const X_AXIS = vec3.fromValues(1, 0, 0);
const Y_AXIS = vec3.fromValues(0, 1, 0);
const Z_AXIS = vec3.fromValues(0, 0, 1);

let player = new Player([0, 0, -5]);

async function main() {
    await Obj.loadObj('obj/cone.obj');
    await Obj.loadObj('obj/cube.obj');
    await Obj.loadObj('obj/icosphere.obj');
    await Obj.loadObj('obj/monitor.obj');
    await Obj.loadObj('obj/monkey.obj');
    await Obj.loadObj('obj/sharpswan.obj');
    await Obj.loadObj('obj/rosalia.obj');
    await Obj.loadObj('obj/miku.obj');
    await Obj.loadObj('obj/omar.obj');
    await Obj.loadObj('obj/roundcube.obj');

    let currentScene;

    let currentTriCount;
    let currentVertices;
    let currentNormals;
    let currentMatrix;
    
    let currentColor;
    let currentAlpha;

    const beatboxScene = new Scene();
    currentScene = beatboxScene;

    const beatbox = new BeatBox();
    beatbox.setObjData('obj/cube.obj');
    currentScene.addObj(beatbox);

    const omar = new Obj();
    omar.setObjData('obj/omar.obj');
    omar.setPos([0, -50, 50]);
    omar.setScale([100, 100, 100]);
    omar.addRotation([0, 1, 0], Math.PI);
    currentScene.addObj(omar);

    const graphicsTestScene = new Scene();
    currentScene = graphicsTestScene;

    currentScene.addObj(new Obj([0, -1, 0], [50, 0.1, 50]));
    currentScene.meshes[currentScene.meshCount - 1].setObjData('obj/cube.obj');

    currentScene.addObj(new Obj([0, 2, 4], [1, 1, 1]));
    currentScene.meshes[currentScene.meshCount - 1].setObjData('obj/cube.obj');
    currentScene.meshes[currentScene.meshCount - 1].setAlpha(0.5);

    // ----- setting up canvas -----
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    gl.viewport(0, 0, WIDTH, HEIGHT);

    gl.clearColor(0.1, 0.1, 0.2, 1.0);
    gl.clearDepth(1.0);
    gl.depthFunc(gl.LEQUAL);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // assumes premultiplied alpha 

    gl.enable(gl.DEPTH_TEST);

    // ----- creating shader programs -----
    const program = createProgram(gl, VERTEXSHADERSOURCECODE, FRAGMENTSHADERSOURCECODE);

    // ----- global light stuff -----
    const globalLightPos = vec3.fromValues(30, 30, -50);
    const globalLightLookingAt = vec3.fromValues(0, 0, 0);
    const globalLightDir = vec3.create();

    const lightPosObj = new Obj([0, 0, 0], [3, 3, 3]);
    const lightPosObjIndex = currentScene.meshCount;
    lightPosObj.setObjData('obj/icosphere.obj');
    currentScene.addObj(lightPosObj);

    const lightDirObj = new Obj([0, 0, 0], [1, 1, 1]);
    lightDirObj.setObjData('obj/icosphere.obj');
    const lightDirObjIndex = currentScene.meshCount;
    currentScene.addObj(lightDirObj);

    // positions global light and sets uniforms
    function setGlobalLight() {
        vec3.set(globalLightDir, 0, 0, 0);
        vec3.sub(globalLightDir, globalLightLookingAt, globalLightPos);
        vec3.normalize(globalLightDir, globalLightDir);

        currentScene.meshes[lightPosObjIndex].setPos(globalLightPos);
        const objdirPos = vec3.clone(globalLightPos);
        vec3.add(objdirPos, objdirPos, globalLightDir);
        vec3.add(objdirPos, objdirPos, globalLightDir);
        vec3.add(objdirPos, objdirPos, globalLightDir);
        vec3.add(objdirPos, objdirPos, globalLightDir);
        vec3.add(objdirPos, objdirPos, globalLightDir);
        vec3.add(objdirPos, objdirPos, globalLightDir);
        vec3.add(objdirPos, objdirPos, globalLightDir);
        currentScene.meshes[lightDirObjIndex].setPos(objdirPos);
    }
    setGlobalLight();

    // ----- main program stuff -----
    // ----- uniforms -----
    gl.useProgram(program);
    // world matrix
    const worldMatrix = mat4.create();
    const u_mWorld = gl.getUniformLocation(program, 'u_mWorld');
    mat4.identity(worldMatrix);
    gl.uniformMatrix4fv(u_mWorld, gl.FALSE, worldMatrix);

    // view matrix
    const viewMatrix = mat4.create();
    const u_mView = gl.getUniformLocation(program, 'u_mView');
    player.camera.update(gl, u_mView, viewMatrix);
    mat4.lookAt(viewMatrix, player.camera.pos, player.camera.lookingAt, player.camera.up);

    // projection matrix
    const projMatrix = mat4.create();
    const u_mProj = gl.getUniformLocation(program, 'u_mProj');
    mat4.perspective(projMatrix, player.camera.fov, player.camera.aspectRatio, player.camera.zNear, player.camera.zFar);
    gl.uniformMatrix4fv(u_mProj, gl.FALSE, projMatrix);

    // obj instance translate scale rotation matrix
    const u_mInstance = gl.getUniformLocation(program, 'u_mInstance');

    // setting light direction for fragment shader 
    const u_lightdir = gl.getUniformLocation(program, 'u_lightdir');
    gl.uniform3fv(u_lightdir, globalLightDir);

    // constant color per object
    const u_color = gl.getUniformLocation(program, 'u_color');
    // constant alpha per object
    const u_alpha = gl.getUniformLocation(program, 'u_alpha');

    // ----- attributes -----
    // creates and enables vertex array, into a_positions
    const a_positions = gl.getAttribLocation(program, 'a_positions');
    const a_positions_BUFFER = createArrayBuffer(gl);

    // creates and enables vertex normals array, into a_normals
    const a_normals = gl.getAttribLocation(program, 'a_normals');
    const a_normals_BUFFER = createArrayBuffer(gl);

    // ----- user input -----
    canvas.addEventListener('click', (event) => {
        canvas.requestPointerLock();
    });
    canvas.addEventListener('mousedown', (event) => {
        beatbox.processMouseDown(event);
    });
    canvas.addEventListener('mouseup', (event) => {
        beatbox.processMouseUp(event);
    });
    canvas.addEventListener('mousemove', (event) => {
        if(document.pointerLockElement === canvas) {
            player.processMouseMove(event);
        }

        beatbox.processMouseMove(event);
    });
    document.addEventListener('keydown', (event) => {
        if(document.pointerLockElement === canvas) {
            player.processKeyPress(event.key);
        }
    });
    document.addEventListener('keyup', (event) => {
        if(document.pointerLockElement === canvas) {
            player.processKeyRelease(event.key);
        }
    });

    // chart and conductor stuff 
    let chartData = await readChart('charts/triple-baka/playback.json');
    let chart = new Chart(chartData);
    let conductor = new Conductor(chart);

    // game loop time stuff
    let then = 0;
    let t = 0;

    // debug overlay stuff
    // finds spans for debug variables
    const debug_fpsElement = document.querySelector('#debug-fps');

    const debug_tElement = document.querySelector('#debug-t');
    const debug_measureElement = document.querySelector('#debug-measure');
    const debug_beatElement = document.querySelector('#debug-beat');
    const debug_bpmElement = document.querySelector('#debug-bpm');
    const debug_beatspermeasureElement = document.querySelector('#debug-beatspermeasure');
    const debug_measuredivisionElement = document.querySelector('#debug-measuredivision');

    const debug_bbQuatWElement = document.querySelector('#beatbox-quatw');
    const debug_bbQuatIElement = document.querySelector('#beatbox-quati');
    const debug_bbQuatJElement = document.querySelector('#beatbox-quatj');
    const debug_bbQuatKElement = document.querySelector('#beatbox-quatk');

    // creates nodes to hold variables
    const debug_fpsNode = document.createTextNode("");

    const debug_tNode = document.createTextNode("");
    const debug_measureNode = document.createTextNode("");
    const debug_beatNode = document.createTextNode("");
    const debug_bpmNode = document.createTextNode("");
    const debug_beatspermeasureNode = document.createTextNode("");
    const debug_measuredivisionNode = document.createTextNode("");

    const debug_bbQuatWNode = document.createTextNode("");
    const debug_bbQuatINode = document.createTextNode("");
    const debug_bbQuatJNode = document.createTextNode("");
    const debug_bbQuatKNode = document.createTextNode("");

    // links nodes to spans
    debug_fpsElement.appendChild(debug_fpsNode);

    debug_tElement.appendChild(debug_tNode);
    debug_measureElement.appendChild(debug_measureNode);
    debug_beatElement.appendChild(debug_beatNode);
    debug_bpmElement.appendChild(debug_bpmNode);
    debug_beatspermeasureElement.appendChild(debug_beatspermeasureNode);
    debug_measuredivisionElement.appendChild(debug_measuredivisionNode);

    debug_bbQuatWElement.appendChild(debug_bbQuatWNode);
    debug_bbQuatIElement.appendChild(debug_bbQuatINode);
    debug_bbQuatJElement.appendChild(debug_bbQuatJNode);
    debug_bbQuatKElement.appendChild(debug_bbQuatKNode);

    document.getElementById("debug-playing-checkbox").addEventListener("change", function() {
        if(this.checked) conductor.start();
        else conductor.stop();

        currentScene = beatboxScene;
    });
    document.getElementById("debug-metronome-checkbox").addEventListener("change", function() {
        conductor.metronome = this.checked;
    });

    function update(t, dt) {
        // keeps time
        conductor.stepdt(dt);

        // updates player and player's camera
        gl.useProgram(program);
        player.update(dt / 1000);
        player.camera.update(gl, u_mView, viewMatrix);

        // updates debug overlay
        debug_fpsNode.nodeValue = (1000 / dt).toFixed(1);

        debug_tNode.nodeValue = (conductor.t / 1000).toFixed(3);
        debug_measureNode.nodeValue = conductor.measure;
        debug_beatNode.nodeValue = conductor.beat;
        debug_bpmNode.nodeValue = conductor.chart.BPM;
        debug_beatspermeasureNode.nodeValue = conductor.chart.beatspermeasure;
        debug_measuredivisionNode.nodeValue = conductor.chart.measuredivision;

        debug_bbQuatWNode.nodeValue = beatbox.rotationQuat[0].toFixed(3);
        debug_bbQuatINode.nodeValue = beatbox.rotationQuat[1].toFixed(3);
        debug_bbQuatJNode.nodeValue = beatbox.rotationQuat[2].toFixed(3);
        debug_bbQuatKNode.nodeValue = beatbox.rotationQuat[3].toFixed(3);

        // TODO: call update for each obj
    }

    function draw(timestamp) {
        const dt = (timestamp - then);
        t += dt;
        then = timestamp;

        update(t, dt);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, WIDTH, HEIGHT);

        // draw all opaque objects in current scene
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.enable(gl.CULL_FACE);
        for(let i = 0; i < currentScene.opaqueIndexes.length; i++) {
            const currentMesh = currentScene.meshes[currentScene.opaqueIndexes[i]];

            currentVertices = currentMesh.data.verticesOut;
            currentNormals = currentMesh.data.normalsOut;
            currentTriCount = currentMesh.data.triCount;
            currentMatrix = currentMesh.matrix;

            currentColor = currentMesh.color;
            currentAlpha = currentMesh.alpha;

            enableAttribute(gl, a_positions, a_positions_BUFFER, 3);
            enableAttribute(gl, a_normals, a_normals_BUFFER, 3);
            setArrayBufferData(gl, a_positions_BUFFER, currentVertices);
            setArrayBufferData(gl, a_normals_BUFFER, currentNormals);

            gl.uniformMatrix4fv(u_mInstance, gl.FALSE, currentMatrix);
            gl.uniform3fv(u_color, currentColor);
            gl.uniform1f(u_alpha, currentAlpha);

            gl.drawArrays(gl.TRIANGLES, 0, currentTriCount * 3);
        }

        // draw all transparent objects in current scene
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        for(let i = 0; i < currentScene.transparentIndexes.length; i++) {
            const currentMesh = currentScene.meshes[currentScene.transparentIndexes[i]];

            currentVertices = currentMesh.data.verticesOut;
            currentNormals = currentMesh.data.normalsOut;
            currentTriCount = currentMesh.data.triCount;
            currentMatrix = currentMesh.matrix;

            currentColor = currentMesh.color;
            currentAlpha = currentMesh.alpha;

            enableAttribute(gl, a_positions, a_positions_BUFFER, 3);
            enableAttribute(gl, a_normals, a_normals_BUFFER, 3);
            setArrayBufferData(gl, a_positions_BUFFER, currentVertices);
            setArrayBufferData(gl, a_normals_BUFFER, currentNormals);

            gl.uniformMatrix4fv(u_mInstance, gl.FALSE, currentMatrix);
            gl.uniform3fv(u_color, currentColor);
            gl.uniform1f(u_alpha, currentAlpha);

            gl.drawArrays(gl.TRIANGLES, 0, currentTriCount * 3);
        }

        requestAnimationFrame(draw);
    }

    console.log(currentScene);

    // starts drawing loop
    requestAnimationFrame(draw);
}

main();