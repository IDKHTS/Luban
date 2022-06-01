import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import i18n from '../../../lib/i18n';
import { humanReadableTime } from '../../../lib/time-utils';
import { DUAL_EXTRUDER_TOOLHEAD_FOR_SM2, HEAD_UNKNOWN, MACHINE_TOOL_HEADS } from '../../../constants';

const GCodeParams = (props) => {
    const [gcodeFile, setGcodeFile] = useState({});


    useEffect(() => {
        const toolHead = props.gcodeFile.tool_head;
        const isDualExture = toolHead === MACHINE_TOOL_HEADS[DUAL_EXTRUDER_TOOLHEAD_FOR_SM2].value;
        let tmpGcodeFile;
        const defaultGcodeFile = {
            type: { key: 'key-Workspace/GCodeParams-GCode Type', value: props.gcodeFile.type },
            nozzle_temperature: { key: 'key-Workspace/GCodeParams-Nozzle temperature', value: `${props.gcodeFile.nozzle_temperature}°C` },
            work_speed: { key: 'key-Workspace/GCodeParams-Work speed', value: `${props.gcodeFile.work_speed}mm/min` },
            estimated_time: { key: 'key-Workspace/GCodeParams-Estimated time', value: `${humanReadableTime(props.gcodeFile.estimated_time)}s` },
        };

        switch (props.gcodeFile.type) {
            case '3dp': {
                tmpGcodeFile = {
                    type: defaultGcodeFile.type,
                    nozzle_temperature: { key: 'key-Workspace/GCodeParams-Left nozzle temperature', value: `${props.gcodeFile.nozzle_temperature}°C` },
                    nozzle_1_temperature: null,
                    build_plate_temperature: { key: 'key-Workspace/GCodeParams-Build plate temperature', value: `${props.gcodeFile.build_plate_temperature}°C` },
                    work_speed: defaultGcodeFile.work_speed,
                    estimated_time: defaultGcodeFile.estimated_time,
                    matierial_weight: { key: 'key-Workspace/GCodeParams-Matierial weight', value: `${(Math.ceil(props.gcodeFile.matierial_weight * 10) / 10).toFixed(1)}g` },
                };
                if (isDualExture) {
                    // tmpGcodeFile.nozzle_temperature = { key: 'key-Workspace/GCodeParams-Left nozzle temperature', value: `${props.gcodeFile.nozzle_1_temperature}°C` };
                    tmpGcodeFile.nozzle_1_temperature = { key: 'key-Workspace/GCodeParams-Right nozzle temperature', value: `${props.gcodeFile.nozzle_1_temperature}°C` };
                }
                break;
            }
            case 'laser': {
                tmpGcodeFile = {
                    type: defaultGcodeFile.type,
                    power: { key: 'key-Workspace/GCodeParams-Power', value: `${props.gcodeFile.power}%` },
                    work_speed: defaultGcodeFile.work_speed,
                    jog_speed: { key: 'key-Workspace/GCodeParams-Jog speed', value: `${props.gcodeFile.jog_speed}mm/min` },
                    estimated_time: defaultGcodeFile.estimated_time,
                };
                break;
            }
            case 'cnc': {
                tmpGcodeFile = {
                    type: defaultGcodeFile.type,
                    work_speed: defaultGcodeFile.work_speed,
                    jog_speed: { key: 'key-Workspace/GCodeParams-Jog speed', value: `${props.gcodeFile.jog_speed}mm/min` },
                    estimated_time: defaultGcodeFile.estimated_time,
                };
                break;
            }
            default:
                tmpGcodeFile = {
                    type: { key: 'key-Workspace/GCodeParams-GCode Type', value: HEAD_UNKNOWN },
                };
        }

        setGcodeFile(tmpGcodeFile);
    }, [props.gcodeFile]);

    return (
        <div className="position-ab bottom-16 right-16">
            {Object.keys(gcodeFile).filter(v => v !== 'thumbnail' && !!gcodeFile[v]).map(property => (
                <div key={property} className="margin-top-8">
                    {i18n._(gcodeFile[property].key)}: {gcodeFile[property].value}
                </div>
            ))}
        </div>
    );
};

GCodeParams.propTypes = {
    gcodeFile: PropTypes.object.isRequired,
};
export default GCodeParams;