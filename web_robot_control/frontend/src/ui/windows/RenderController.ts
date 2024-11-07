import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRButton } from 'three/addons/webxr/VRButton.js'
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js'
import { XRHandModelFactory } from 'three/examples/jsm/Addons.js'
import { VRNavigation } from './VRNavigation'
import { urdfLoader } from './urdfLoader'

export class RenderController {
    scene: THREE.Scene
    renderer: THREE.WebGLRenderer
    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    controllers: Array<{
        hand: THREE.XRHandSpace
        grip: THREE.XRGripSpace
        controller: THREE.XRTargetRaySpace
    }>

    robot: THREE.Group<THREE.Object3DEventMap> | undefined
    map: THREE.Group<THREE.Object3DEventMap> | undefined

    frameCallbacks: Array<() => void> = []

    VRNavigation: VRNavigation

    constructor(canvas: HTMLCanvasElement, width: number, height: number) {
        // ===== Scene =====
        //THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1)
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0x263238)
        // this.scene.useRightHandedSystem = true

        // ===== Camera =====
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
        this.camera.position.x = -15
        this.camera.position.y = 15
        this.camera.position.z = 15
        this.camera.lookAt(0, 0, -10)

        // ===== Renderer =====
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
        })
        this.renderer.setSize(width, height)

        // ===== Controls =====
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true
        this.controls.screenSpacePanning = false
        this.controls.zoomToCursor = true
        this.frameCallbacks.push(() => this.controls.update())

        // ===== WebXR =====
        this.renderer.xr.enabled = true
        canvas.parentElement!.appendChild(VRButton.createButton(this.renderer))

        this.controllers = this.initControllers()

        this.initTestLight()
        this.loadTestModels()
        this.loadModels()
        this.VRNavigation = new VRNavigation(this)

        this.renderer.setAnimationLoop(() => {
            this.render()
        })
        this.render()
    }

    updateWindowDimensions = (width: number, height: number) => {
        this.renderer.setSize(width, height)
        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()

        this.render()
    }

    render = () => {
        this.frameCallbacks.forEach((callback) => callback())
        this.renderer.render(this.scene, this.camera)
    }

    initControllers = () => {
        const controllerModelFactory = new XRControllerModelFactory()
        const handModelFactory = new XRHandModelFactory()

        return [0, 1].map((index) => {
            const controller = this.renderer.xr.getController(index)
            this.scene.add(controller)

            const controllerGrip = this.renderer.xr.getControllerGrip(index)
            const model =
                controllerModelFactory.createControllerModel(controllerGrip)
            controllerGrip.add(model)
            this.scene.add(controllerGrip)

            const hand = this.renderer.xr.getHand(index)
            hand.add(handModelFactory.createHandModel(hand, 'mesh'))
            this.scene.add(hand)

            return {
                hand,
                grip: controllerGrip,
                controller,
            }
        })
    }

    initTestLight = () => {
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3)
        hemiLight.position.set(0, 0, 20)
        this.scene.add(hemiLight)

        const dirLight = new THREE.DirectionalLight(0xffffff, 2)
        dirLight.position.set(3, 10, 10)
        this.scene.add(dirLight)
    }

    loadModels = async () => {
        const robot = await urdfLoader(
            '/models/urdf/tiago.urdf',
            '/joint_states'
        )
        robot.rotateX(-Math.PI / 2)
        robot.position.set(0, 0.05, 0)
        this.scene.add(robot)
    }

    loadTestModels = () => {
        new GLTFLoader().load(
            '/models/marsyard_2022.glb',
            (gltf) => {
                this.map = gltf.scene

                this.scene.add(gltf.scene)
            },
            undefined,
            (error) => {
                console.error(error)
            }
        )

        const axesTest = new THREE.AxesHelper(3)
        this.scene.add(axesTest)
    }
}
