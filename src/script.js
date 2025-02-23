const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

const canvasName = "s3canvas";
const canvas = document.getElementById(canvasName);
const gl = canvas.getContext("webgl2");

let audioContext;

const mat4  = glMatrix.mat4;
const vec3  = glMatrix.vec3;

let player = new Player();

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

    readChart('charts/shellfie/playback.json');

    meshes = [];
    let meshCount = 0;

    meshes.push(new Obj([0, 2, 25], [1, 1, 1]));
    meshes[meshCount++].setObjData('obj/roundcube.obj');

    meshes.push(new Obj([5, 15, 25], [25, 10, 0.1]));
    meshes[meshCount].setAxisRotation("X", Math.PI / 6);
    meshes[meshCount].setAxisRotation("Y", -Math.PI / 16);
    meshes[meshCount].setAxisRotation("Z", -Math.PI / 30);
    meshes[meshCount++].setObjData('obj/cube.obj');

    meshes.push(new Obj([5, 20, 25], [10, 15, 0.1]));
    meshes[meshCount++].setObjData('obj/cube.obj');

    meshes.push(new Obj([0, 0, 27], [30, 20, 0.1]));
    meshes[meshCount++].setObjData('obj/cube.obj');

    for(let i = 0; i < 3; i++) {
        meshes.push(new Obj([Math.random() * 40 - 20, Math.random() * 40 - 20, 27 + (Math.random() - 0.5)], [1 - Math.random(), 1 - Math.random(), 1 - Math.random()]));
        meshes[meshCount++].setObjData('obj/icosphere.obj');
    }

    let currentTriCount;
    let currentVertices;
    let currentNormals;
    let currentMatrix;

    // ----- setting up canvas -----
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    gl.viewport(0, 0, WIDTH, HEIGHT);

    gl.clearColor(0.1, 0.1, 0.2, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.depthFunc(gl.LEQUAL);

    // ----- creating shader programs -----
    const program          = createProgram(gl, VERTEXSHADERSOURCECODE, FRAGMENTSHADERSOURCECODE);
    const shadow_program   = createProgram(gl, SHADOWVERTEXSHADERSOURCECODE, SHADOWFRAGMENTSHADERSOURCECODE);
    const pixelate_program = createProgram(gl, PIXELATE_VERTEXSHADERSOURCECODE, PIXELATE_FRAGMENTSHADERSOURCECODE);

    // ----- pixelate program stuff -----
    gl.useProgram(pixelate_program);
    const pixelate_downscaleSize = [400, 300];
    const pixelate_texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, pixelate_texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ...pixelate_downscaleSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const pixelate_depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, pixelate_depthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, ...pixelate_downscaleSize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const pixelate_framebuffer = gl.createFramebuffer();

    // finding a_positions attribute 
    const pixelate_a_positions = gl.getAttribLocation(pixelate_program, 'a_positions');
    const pixelate_a_positions_BUFFER = createArrayBuffer(gl);

    const pixelate_quadVertices = [
        -1, -1,
        1, -1,
        -1, 1,
        1, 1,
    ];

    // ----- shadow program stuff -----
    gl.useProgram(shadow_program);
    const shadow_u_mInstance = gl.getUniformLocation(shadow_program, 'u_mInstance');
    const shadow_u_mLightMVP = gl.getUniformLocation(shadow_program, 'u_mLightMVP');

    const shadow_lightPos = vec3.fromValues(30, 30, -50);
    const shadow_lightLookingAt = vec3.fromValues(...meshes[0].pos);
    const lightdir = vec3.create();

    const shadow_lightZNear = 0.1;
    const shadow_lightZFar = 300;
    const shadow_orthoFrustum = [-100, 100, -100, 100];

    const shadow_lightPovView = mat4.create();
    const shadow_lightPovProj = mat4.create();
    const shadow_lightPovMVP = mat4.create();

    const lightPosObj = new Obj([0, 0, 0], [3, 3, 3]);
    const lightPosObjIndex = meshCount;
    meshes.push(lightPosObj);
    meshes[meshCount++].setObjData('obj/icosphere.obj');

    const lightDirObj = new Obj([0, 0, 0], [1, 1, 1]);
    const lightDirObjIndex = meshCount;
    meshes.push(lightDirObj);
    meshes[meshCount++].setObjData('obj/icosphere.obj');

    // sets lightMVP matrix, lightdir uniform, and positions 'light' object(s)
    function generateLightMVP() {
        vec3.set(lightdir, 0, 0, 0);
        vec3.sub(lightdir, shadow_lightLookingAt, shadow_lightPos);
        vec3.normalize(lightdir, lightdir);

        mat4.lookAt(shadow_lightPovView, shadow_lightPos, shadow_lightLookingAt, [0, 1, 0]);
        //mat4.ortho(shadow_lightPovProj, ...shadow_orthoFrustum, shadow_lightZNear, shadow_lightZFar);
        mat4.perspective(shadow_lightPovProj, Math.PI / 2, WIDTH / HEIGHT, 0.1, 1000);
        mat4.multiply(shadow_lightPovMVP, shadow_lightPovProj, shadow_lightPovView);
        gl.uniformMatrix4fv(shadow_u_mLightMVP, gl.FALSE, shadow_lightPovMVP);

        meshes[lightPosObjIndex].setPos(shadow_lightPos);
        const objdirPos = vec3.clone(shadow_lightPos);
        vec3.add(objdirPos, objdirPos, lightdir);
        vec3.add(objdirPos, objdirPos, lightdir);
        vec3.add(objdirPos, objdirPos, lightdir);
        vec3.add(objdirPos, objdirPos, lightdir);
        vec3.add(objdirPos, objdirPos, lightdir);
        vec3.add(objdirPos, objdirPos, lightdir);
        meshes[lightDirObjIndex].setPos(objdirPos);
    }
    generateLightMVP();

    // finding a_positions attribute 
    const shadow_a_positions = gl.getAttribLocation(shadow_program, 'a_positions');
    const shadow_a_positions_BUFFER = createArrayBuffer(gl);

    // setting up texture map
    const shadow_depthTextureSize = [2 << 11, 2 << 11];
    const shadow_depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, shadow_depthTexture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT32F, ...shadow_depthTextureSize);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const shadow_depthFramebuffer = gl.createFramebuffer();

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

    // obj instance translate scale matrix
    const u_mInstance = gl.getUniformLocation(program, 'u_mInstance');

    // lightMVP for vertex shader
    const u_mLightPovMVP = gl.getUniformLocation(program, 'u_mLightPovMVP');
    gl.uniformMatrix4fv(u_mLightPovMVP, false, shadow_lightPovMVP);

    // shadow map for fragment shader
    const u_shadowMap = gl.getUniformLocation(program, 'u_shadowMap');

    // setting light direction for fragment shader 
    const u_lightdir = gl.getUniformLocation(program, 'u_lightdir');
    gl.uniform3fv(u_lightdir, lightdir);

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
    canvas.addEventListener('mousemove', (event) => {
        if(document.pointerLockElement === canvas) {
            player.processMouseMouse(event);
        }
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

    let then = 0;
    let t = 0;

    let lastMeasureTime = 0.0;
    let lastBeatTime = 0.0;
    let measure = 0;
    let beat = 0;

    const BPM = 96.51 * 2;
    const beatspermeasure = 4;
    const measuredivision = 4;

    const milisecondsPerMeasure = (60 * 1000 * beatspermeasure) / BPM;

    function update(t, dt) {
        // measure passed
        if(t - lastMeasureTime > milisecondsPerMeasure) {
            measure++;
            beat = 0;
            lastMeasureTime = t;

        } else {
            if(t - lastBeatTime > milisecondsPerMeasure / measuredivision) {
                beat++;
                lastBeatTime = t;
                console.log(measure, beat);
            }
        }

        // sets position and direction of shadow light
        vec3.set(shadow_lightPos, Math.sin(t / 1000) * 30, Math.sin(t / 10000) * 50, -40 + Math.sin(t / 3000) * 40);
        gl.useProgram(shadow_program)
        generateLightMVP()
        gl.useProgram(program);
        gl.uniform3fv(u_lightdir, lightdir);
        gl.uniformMatrix4fv(u_mLightPovMVP, false, shadow_lightPovMVP);
    }

    function draw(timestamp) {
        const dt = (timestamp - then);
        t += dt;
        then = timestamp;

        update(t, dt / 1000);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // renders shadow map
        gl.useProgram(shadow_program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadow_depthFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadow_depthTexture, 0);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, ...shadow_depthTextureSize);

        for (let i = 0; i < meshes.length; i++) {
            // temp: skips light direction obj and light obj from being drawn to shadow texture
            // i.e., the camera balls dont cast shadow
            if(i == lightDirObjIndex || i == lightPosObjIndex) continue;

            currentVertices = meshes[i].data.verticesOut;
            currentNormals = meshes[i].data.normalsOut;
            currentTriCount = meshes[i].data.triCount;
            currentMatrix = meshes[i].matrix;

            enableAttribute(gl, shadow_a_positions, shadow_a_positions_BUFFER, 3);
            setArrayBufferData(gl, shadow_a_positions_BUFFER, currentVertices);
            gl.uniformMatrix4fv(shadow_u_mInstance, gl.FALSE, currentMatrix);

            gl.drawArrays(gl.TRIANGLES, 0, currentTriCount * 3);
        }

        // render everything onto pixelate texture
        gl.useProgram(program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, pixelate_framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pixelate_texture, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, pixelate_depthTexture, 0);
        gl.bindTexture(gl.TEXTURE_2D, shadow_depthTexture);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, ...pixelate_downscaleSize);
        gl.uniform1i(u_shadowMap, 0);
        for(let i = 0; i < meshes.length; i++) {
            currentVertices = meshes[i].data.verticesOut;
            currentNormals = meshes[i].data.normalsOut;
            currentTriCount = meshes[i].data.triCount;
            currentMatrix = meshes[i].matrix;

            enableAttribute(gl, a_positions, a_positions_BUFFER, 3);
            enableAttribute(gl, a_normals, a_normals_BUFFER, 3);
            setArrayBufferData(gl, a_positions_BUFFER, currentVertices);
            setArrayBufferData(gl, a_normals_BUFFER, currentNormals);
            gl.uniformMatrix4fv(u_mInstance, gl.FALSE, currentMatrix);

            gl.drawArrays(gl.TRIANGLES, 0, currentTriCount * 3);
            meshes[i].update(dt);
        }

        // draw pixelated quad to screen (final pass )
        gl.useProgram(pixelate_program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, pixelate_texture);
        gl.viewport(0, 0, WIDTH, HEIGHT);

        enableAttribute(gl, pixelate_a_positions, pixelate_a_positions_BUFFER, 2);
        setArrayBufferData(gl, pixelate_a_positions_BUFFER, pixelate_quadVertices);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.useProgram(program);
        player.update(dt / 1000);
        player.camera.update(gl, u_mView, viewMatrix);

        requestAnimationFrame(draw);
    }

    // starts drawing loop
    requestAnimationFrame(draw);
}

main();