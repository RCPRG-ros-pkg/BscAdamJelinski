import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { VRButton } from 'three/addons/webxr/VRButton.js'
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js'
import { XRHandModelFactory } from 'three/examples/jsm/Addons.js'
import { VRNavigation } from './VRNavigation'
import { VRPositionPublisher } from './VRPositionPublisher'
import { ROS2TFClient, Ros } from 'roslib'
import { useRosStore } from '@/stores/ros'
import { robotLoader } from './robotLoader'
import { parse } from 'yaml'
import { RenderControllerConfig, TopicVisualizer } from './types'
import {
    nav_msgs_path,
    nav_msgs_occupancygrid,
    nav_msgs_odometry,
    sensor_msgs_pointcloud2,
    geometry_msgs_posestamped,
    visualization_msgs_marker,
} from './topicVisualisation'
import { useTopicSubscriber } from '@/core/roslibExtensions'

const topicVisualizers: Record<string, TopicVisualizer> = {
    'nav_msgs/Path': nav_msgs_path,
    'nav_msgs/OccupancyGrid': nav_msgs_occupancygrid,
    'sensor_msgs/PointCloud2': sensor_msgs_pointcloud2,
    'nav_msgs/Odometry': nav_msgs_odometry,
    'geometry_msgs/PoseStamped': geometry_msgs_posestamped,
    'visualization_msgs/Marker': visualization_msgs_marker,
}

export class RenderController {
    scene: THREE.Scene
    renderer: THREE.WebGLRenderer
    camera: THREE.PerspectiveCamera
    cameraGroup: THREE.Group
    controls: OrbitControls
    controllers: Array<{
        hand: THREE.XRHandSpace
        grip: THREE.XRGripSpace
        controller: THREE.XRTargetRaySpace
    }>

    robot: THREE.Group<THREE.Object3DEventMap> | undefined
    map: THREE.Group<THREE.Object3DEventMap> | undefined

    frameCallbacks: Array<() => void> = []

    VRNavigation!: VRNavigation
    VRPositionPublisher!: VRPositionPublisher

    tf2Client!: ROS2TFClient

    config!: RenderControllerConfig

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
        this.cameraGroup = new THREE.Group()
        this.cameraGroup.add(this.camera)
        this.scene.add(this.cameraGroup)

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

        this.initializeWithConfig()
    }

    async initializeWithConfig() {
        try {
            await this.loadConfig()
        } catch (error) {
            this.getDefaultConfig()
        }

        this.initTF2()
        this.initTestLight()
        this.loadModels()
        this.loadTopics()
        this.VRNavigation = new VRNavigation(this)
        this.VRPositionPublisher = new VRPositionPublisher(
            this,
            this.config.vrPublisher
        )
        this.initGrid()

        this.renderer.setAnimationLoop(() => {
            this.render()
        })
        this.render()
    }

    async loadConfig() {
        const response = await fetch('/config.yaml', { cache: 'no-store' })
        if (!response.ok)
            throw new Error(`Couldn't load config: ${response.status}`)

        const yamlText = await response.text()
        this.config = parse(yamlText) as RenderControllerConfig
    }

    getDefaultConfig() {
        this.config = {
            tf: {
                fixed_frame: 'map',
                angular_threshold: 0.01,
                translation_threshold: 0.01,
            },
            robot: {
                joint_states_topics: ['/joint_states'],
            },
            topics: [],
            vrPublisher: {
                headsetTopic: '/vr/headset_pose',
                leftControllerTopic: '/vr/left_controller_pose',
                rightControllerTopic: '/vr/right_controller_pose',
                publishRate: 30,
            },
        }
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
            this.cameraGroup.add(controller)

            const controllerGrip = this.renderer.xr.getControllerGrip(index)
            const model =
                controllerModelFactory.createControllerModel(controllerGrip)
            controllerGrip.add(model)
            this.cameraGroup.add(controllerGrip)

            const hand = this.renderer.xr.getHand(index)
            hand.add(handModelFactory.createHandModel(hand, 'mesh'))
            this.cameraGroup.add(hand)

            return {
                hand,
                grip: controllerGrip,
                controller,
            }
        })
    }

    initTestLight = () => {
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 2)
        hemiLight.position.set(0, 0, 20)
        this.scene.add(hemiLight)

        const dirLight = new THREE.DirectionalLight(0xffffff, 1)
        dirLight.position.set(3, 10, 10)
        this.scene.add(dirLight)
    }

    initTF2 = () => {
        const rosStore = useRosStore()
        this.tf2Client = new ROS2TFClient({
            ros: rosStore.ros!! as Ros,
            fixedFrame: this.config.tf.fixed_frame,
            angularThres: this.config.tf.angular_threshold,
            transThres: this.config.tf.translation_threshold,
        })
    }

    loadModels = async () => {
        useTopicSubscriber(
            '/robot_description',
            'std_msgs/msg/String',
            async (msg) => {
                const urdf = msg.data
                const robot = await robotLoader(
                    urdf,
                    this.config.robot.joint_states_topics,
                    this
                )
                this.scene.add(robot)
            }
        )
    }

    loadTopics = () => {
        const group = new THREE.Group()
        group.rotateX(-Math.PI / 2)

        this.config.topics.forEach((topic) => {
            const visualizer = topicVisualizers[topic.message_type]
            if (visualizer) {
                group.add(visualizer(topic.name, this, topic.options))
            } else {
                console.warn(
                    `Unsupported message type: ${topic.message_type} for topic: ${topic.name}`
                )
            }
        })

        this.scene.add(group)
    }

    initGrid = () => {
        console.log(this.config.gridCellCount, this.config.gridCellSize)
        if (!this.config.gridCellCount || !this.config.gridCellSize) {
            return
        }
        const gridCellCount = this.config.gridCellCount
        const gridCellSize = this.config.gridCellSize

        const gridHelper = new THREE.GridHelper(
            gridCellCount * gridCellSize,
            gridCellCount,
            0x888888,
            0x444444
        )
        this.scene.add(gridHelper)
    }
}
