import { includes, find } from 'lodash';
import Business, { CoordinateType } from '../../../lib/SACP-SDK/SACP/business/Business';
import SocketServer from '../../../lib/SocketManager';
import logger from '../../../lib/logger';
import { DUAL_EXTRUDER_TOOLHEAD_FOR_SM2, LEVEL_TWO_POWER_LASER_FOR_SM2,
    COORDINATE_AXIS, WORKFLOW_STATUS_MAP, HEAD_PRINTING, EMERGENCY_STOP_BUTTON, ENCLOSURE_MODULES, AIR_PURIFIER_MODULES, ROTARY_MODULES, MODULEID_TOOLHEAD_MAP, A400_HEADT_BED_FOR_SM2, HEADT_BED_FOR_SM2, LEVEL_ONE_POWER_LASER_FOR_SM2, LEVEL_TWO_CNC_TOOLHEAD_FOR_SM2, STANDARD_CNC_TOOLHEAD_FOR_SM2 } from '../../../../app/constants';
import { readUint8 } from '../../../lib/SACP-SDK/SACP/helper';
import GetHotBed from '../../../lib/SACP-SDK/SACP/business/models/GetHotBed';
import CoordinateSystemInfo from '../../../lib/SACP-SDK/SACP/business/models/CoordinateSystemInfo';
import { EventOptions, MarlinStateData } from '../types';
import ExtruderInfo from '../../../lib/SACP-SDK/SACP/business/models/ExtruderInfo';
import CoordinateInfo, { Direction } from '../../../lib/SACP-SDK/SACP/business/models/CoordinateInfo';
import CncSpeedState from '../../../lib/SACP-SDK/SACP/business/models/CncSpeedState';

const log = logger('lib:SocketBASE');

class SocketBASE {
    // private heartbeatTimer;

    socket: SocketServer;

    sacpClient: Business;

    moduleInfos: any = {};

    public startHeartbeatBase = (sacpClient: Business) => {
        this.sacpClient = sacpClient;
        let stateData: MarlinStateData;
        let statusKey = 0;
        const moduleStatusList = {
            rotaryModule: false,
            airPurifier: false,
            emergencyStopButton: false,
            enclosure: false
        };
        let a = true;
        this.sacpClient.subscribeHeartbeat({ interval: 1000 }, async (data) => {
            // log.info(`receive heartbeat: ${data.response}`);
            statusKey = readUint8(data.response.data, 0);
            await this.sacpClient.getModuleInfo().then(({ data: moduleInfos }) => {
                a && console.log('==================moduleInfos start=======================');
                a && console.log(moduleInfos);
                a && console.log('==================moduleInfos end=======================');
                moduleInfos.forEach(module => {
                    if (includes(EMERGENCY_STOP_BUTTON, module.moduleId)) {
                        moduleStatusList.emergencyStopButton = true;
                    }
                    if (includes(ENCLOSURE_MODULES, module.moduleId)) {
                        moduleStatusList.enclosure = true;
                    }
                    if (includes(ROTARY_MODULES, module.moduleId)) {
                        moduleStatusList.rotaryModule = true;
                    }
                    if (includes(AIR_PURIFIER_MODULES, module.moduleId)) {
                        stateData.airPurifier = true;
                        // new to update airPurifier status
                    }

                    a && console.log(module.moduleId);
                    a && console.log(module);
                    const keys = Object.keys(MODULEID_TOOLHEAD_MAP);
                    a && console.log(keys, [String(module.moduleId)], includes(keys, String(module.moduleId)));
                    if (includes(keys, String(module.moduleId))) {
                        this.moduleInfos[MODULEID_TOOLHEAD_MAP[module.moduleId]] = module;
                    }
                });
            });
            a = false;
            // stateData.status = WORKFLOW_STATUS_MAP[statusKey];
            this.socket && this.socket.emit('Marlin:state', { state: {
                ...stateData,
                status: WORKFLOW_STATUS_MAP[statusKey],
                headType: HEAD_PRINTING,
                moduleStatusList
            } });
            // clearTimeout(this.heartbeatTimer);
            // this.heartbeatTimer = setTimeout(() => {
            //     log.info('TCP connection closed');
            //     this.socket && this.socket.emit('connection:close');
            // }, 60000); // TODO: should change this after file transfer ready
        }).then((res) => {
            log.info(`subscribe heartbeat success: ${res}`);
        });
        this.sacpClient.subscribeHotBedTemperature({ interval: 1000 }, (data) => {
            // log.info(`revice hotbed: ${data.response}`);
            const hotBedInfo = new GetHotBed().fromBuffer(data.response.data);
            // console.log(hotBedInfo);
            stateData = {
                ...stateData,
                heatedBedTargetTemperature: hotBedInfo?.zoneList[0]?.targetTemzperature || 0,
                heatedBedTemperature: hotBedInfo?.zoneList[0]?.currentTemperature || 0
            };
        }).then(res => {
            log.info(`subscribe hotbed success: ${res}`);
        });
        this.sacpClient.subscribeNozzleInfo({ interval: 1000 }, (data) => {
            // log.info(`revice nozzle: ${data.response}`);
            const nozzleInfo = new ExtruderInfo().fromBuffer(data.response.data);
            const leftInfo = find(nozzleInfo.extruderList, { index: 0 });
            const rightInfo = find(nozzleInfo.extruderList, { index: 1 });
            stateData = {
                ...stateData,
                nozzleTemperature: leftInfo.currentTemperature,
                nozzleTargetTemperature: leftInfo.targetTemperature,
                nozzleRightTargetTemperature: rightInfo?.targetTemperature || 0,
                nozzleRightTemperature: rightInfo?.currentTemperature || 0
            };
        }).then(res => {
            log.info(`subscribe nozzle success: ${res}`);
        });
        this.sacpClient.subscribeCurrentCoordinateInfo({ interval: 1000 }, (data) => {
            // log.info(`revice coordinate: ${data.response}`);
            const response = data.response;
            const coordinateInfos = new CoordinateSystemInfo().fromBuffer(response.data);
            const currentCoordinate = coordinateInfos.coordinates;
            const originCoordinate = coordinateInfos.originOffset;
            const pos = {
                x: currentCoordinate[0].value,
                y: currentCoordinate[1].value,
                z: currentCoordinate[2].value,
                b: currentCoordinate[3].value,
                isFourAxis: moduleStatusList.rotaryModule
            };
            const originOffset = {
                x: originCoordinate[0].value,
                y: originCoordinate[1].value,
                z: originCoordinate[2].value,
                b: originCoordinate[3].value
            };
            stateData = {
                ...stateData,
                pos,
                originOffset
            };
        }).then(res => {
            log.info(`subscribe coordination success: ${res}`);
        });

        this.sacpClient.subscribeCncSpeedState({ interval: 1000 }, (data) => {
            // log.info(`revice coordinate: ${data.response}`);
            const response = data.response;
            const cncSpeedState = new CncSpeedState().fromBuffer(response.data);
            console.log('cncSpeedState', cncSpeedState);
            // stateData = {
            //     ...stateData,
            //     pos,
            //     originOffset
            // };
        }).then(res => {
            log.info(`subscribe coordination success: ${res}`);
        });
    };

    public executeGcode = async (options: EventOptions, callback: () => void) => {
        log.info('run executeGcode');
        const { gcode } = options;
        const gcodeLines = gcode.split('\n');
        // callback && callback();
        log.debug(`executeGcode, ${gcodeLines}`);
        try {
            callback && callback();
            this.socket && this.socket.emit('connection:executeGcode', { msg: '', res: null });
        } catch (e) {
            log.error(`execute gcode error: ${e}`);
        }
    };

    public goHome = () => {
        log.info('onClick gohome');
        this.sacpClient.requestHome().then(({ response }) => {
            log.info(`Go-Home, ${response}`);
        });
    }

    public coordinateMove = ({ moveOrders, jogSpeed }) => {
        log.info(`coordinate: ${moveOrders}`);
        const distances = [];
        const directions = [];
        moveOrders.forEach(item => {
            directions.push(COORDINATE_AXIS[item.axis]);
            distances.push(item.distance);
        });
        this.sacpClient.requestAbsoluteCooridateMove(directions, distances, jogSpeed, CoordinateType.WORKSPACE).then(res => {
            log.info(`Coordinate Move: ${res}`);
        });
    }

    public setWorkOrigin = ({ xPosition, yPosition, zPosition, bPosition }) => {
        log.info(`position: ${xPosition}, ${yPosition}, ${zPosition}, ${bPosition}`);
        const coordinateInfos = [new CoordinateInfo(Direction.X1, 0), new CoordinateInfo(Direction.Y1, 0), new CoordinateInfo(Direction.Z1, 0)];
        if (bPosition) {
            coordinateInfos.push(new CoordinateInfo(Direction.B1, -bPosition));
        }
        this.sacpClient.setWorkOrigin(coordinateInfos).then(res => {
            // log.info(`Set Work Origin: ${res.data}`);
            console.log(res);
        });
    }

    public switchExtruder = (extruderIndex) => {
        const toolhead = this.moduleInfos && this.moduleInfos[DUAL_EXTRUDER_TOOLHEAD_FOR_SM2];
        console.log(this.moduleInfos);
        if (!toolhead) {
            log.error(`no match toolhead 3dp, moduleInfos:${this.moduleInfos}`,);
            return;
        }
        const key = toolhead && toolhead.key;
        this.sacpClient.SwitchExtruder(key, extruderIndex).then(({ response }) => {
            log.info(`SwitchExtruder, ${JSON.stringify(response)}`);
        });
    }

    public updateNozzleTemperature = (extruderIndex, temperature) => {
        // TODO: single extruder?
        const toolhead = this.moduleInfos && this.moduleInfos[DUAL_EXTRUDER_TOOLHEAD_FOR_SM2];
        console.log(this.moduleInfos);
        if (!toolhead) {
            log.error(`no match toolhead 3dp, moduleInfos:${this.moduleInfos}`,);
            return;
        }
        const key = toolhead && toolhead.key;
        this.sacpClient.SetExtruderTemperature(key, extruderIndex, temperature).then(({ response }) => {
            log.info(`SetExtruderTemperature, ${JSON.stringify(response)}`);
        });
    }

    public loadFilament() {
        console.log(this.moduleInfos);
        const toolHead = this.moduleInfos && (this.moduleInfos[DUAL_EXTRUDER_TOOLHEAD_FOR_SM2]);// || this.moduleInfos[HEADT_BED_FOR_SM2]); //
        if (!toolHead) {
            log.error(`non-eixst toolHead, moduleInfos:${this.moduleInfos}`,);
            return;
        }

        this.sacpClient.ExtruderMovement(toolHead.key, 0, 60, 200, 0, 0).then(({ response }) => {
            log.info(`loadFilament, ${JSON.stringify(response)}`);
        });
    }

    public unloadFilament() {
        console.log(this.moduleInfos);
        const toolHead = this.moduleInfos && (this.moduleInfos[DUAL_EXTRUDER_TOOLHEAD_FOR_SM2]);// || this.moduleInfos[HEADT_BED_FOR_SM2]); //
        if (!toolHead) {
            log.error(`non-eixst toolHead, moduleInfos:${this.moduleInfos}`,);
            return;
        }

        this.sacpClient.ExtruderMovement(toolHead.key, 0, 6, 200, 60, 150).then(({ response }) => {
            log.info(`unloadFilament, ${JSON.stringify(response)}`);
        });
    }


    // TODO
    public updateBedTemperature = (zoneIndex, temperature) => {
        console.log(this.moduleInfos);
        const heatBed = this.moduleInfos && (this.moduleInfos[A400_HEADT_BED_FOR_SM2] || this.moduleInfos[HEADT_BED_FOR_SM2]); //
        if (!heatBed) {
            log.error(`non-eixst heatBed, moduleInfos:${this.moduleInfos}`,);
            return;
        }

        this.sacpClient.setHotBedTemperature(heatBed.key, zoneIndex, temperature).then(({ response }) => {
            log.info(`updateBedTemperature, ${JSON.stringify(response)}`);
        });
    }

    // public updateZOffset = (ary) => {
    //     this.sacpClient.SetExtruderOffset(key, ary).then(({ response }) => {
    //         log.info(`SetExtruderOffset, ${response}`);
    //     });
    // }

    // workspeed
    public updateWorkSpeed = (headType, workSpeed, extruderIndex = 0) => {
        const headModule = this.moduleInfos && (this.moduleInfos[headType]); //
        if (!headModule) {
            log.error(`non-eixst headtype[${headType}], moduleInfos:${JSON.stringify(this.moduleInfos)}`,);
            return;
        }

        this.sacpClient.setWorkSpeed(headModule.key, extruderIndex, workSpeed).then(({ response }) => {
            log.info(`updateWorkSpeed, ${response}`);
        });
    }


    public updateLaserPower = (value) => {
        console.log('set laser power', value);
        const laserLevelTwoHead = this.moduleInfos && (this.moduleInfos[LEVEL_TWO_POWER_LASER_FOR_SM2] || this.moduleInfos[LEVEL_ONE_POWER_LASER_FOR_SM2]); //
        if (!laserLevelTwoHead) {
            log.error(`non-eixst laserLevelHead, moduleInfos:${this.moduleInfos}`,);
            return;
        }

        this.sacpClient.SetLaserPower(laserLevelTwoHead.key, value).then(({ response }) => {
            log.info(`updateLaserPower, ${JSON.stringify(response)}`);
        });
    }

    public switchCNC = (headStatus) => {
        const toolhead = this.moduleInfos && (this.moduleInfos[LEVEL_TWO_CNC_TOOLHEAD_FOR_SM2] || this.moduleInfos[STANDARD_CNC_TOOLHEAD_FOR_SM2]);
        console.log(this.moduleInfos);
        if (!toolhead) {
            log.error(`no match ${LEVEL_TWO_CNC_TOOLHEAD_FOR_SM2}:15 or ${STANDARD_CNC_TOOLHEAD_FOR_SM2}:1 , moduleInfos:${this.moduleInfos}`,);
            return;
        }

        this.sacpClient.switchCNC(toolhead.key, !headStatus).then(({ response }) => {
            log.info(`switchCNC to [${!headStatus}], ${JSON.stringify(response)}`);
        });
    }

    public updateToolHeadSpeed = (speed) => {
        const toolhead = this.moduleInfos && this.moduleInfos[LEVEL_TWO_CNC_TOOLHEAD_FOR_SM2];
        console.log(this.moduleInfos);
        if (!toolhead) {
            log.error(`no match ${LEVEL_TWO_CNC_TOOLHEAD_FOR_SM2}, moduleInfos:${this.moduleInfos}`,);
            return;
        }

        this.sacpClient.setToolHeadSpeed(toolhead.key, speed).then(({ response }) => {
            log.info(`updateToolHeadSpeed Speed:[${speed}], ${JSON.stringify(response)}`);
        });
    }

    //
}

export default SocketBASE;
