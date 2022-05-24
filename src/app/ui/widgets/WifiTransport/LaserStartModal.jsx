import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { Radio } from '../../components/Radio';
import Modal from '../../components/Modal';
import { Button } from '../../components/Buttons';
import { NumberInput as Input } from '../../components/Input';
import i18n from '../../../lib/i18n';
import { actions as machineActions } from '../../../flux/machine';
import TipTrigger from '../../components/TipTrigger';



function LaserStartModal(props) {
    const {
        showStartModal,
        isHeightPower,
        isSerialConnect,
        isRotate
    } = props;
    const [selectedValue, setSelectedValue] = useState(0);
    const { size, materialThickness } = useSelector(state => state?.machine);
    const dispatch = useDispatch();

    const onChange = (event) => {
        setSelectedValue(event.target.value);
    };


    const handlerAxis = value => typeof value.isRotate === 'undefined' || value.isRotate === isRotate;
    const handlerPowerLevel = value => typeof value.isHeightPower === 'undefined' || value.isHeightPower === isHeightPower;
    const handlerConnect = value => typeof value.isSerialConnect === 'undefined' || value.isSerialConnect === isSerialConnect;
    const handleDisable = v => v.disable && handlerAxis(v.disable) && handlerPowerLevel(v.disable) && handlerConnect(v.disable);

    console.log(showStartModal, isHeightPower, isRotate);



    const onChangeMaterialThickness = (value) => {
        if (value < 0) {
            // safely setting
            value = 0;
        }
        dispatch(machineActions.updateMaterialThickness(value));
    };

    const arry = [
        {
            name: '自动测距（Auto Mode）',
            description: '机器将会依据工作原点和工作区域，自动计算材料位置，然后移动执行头到相应位置测量材料厚度。机器根据测量到的材料厚度，自动调整激光高度。',
            show: {
            // mean: 'true' will show only can rotate status, false will only show no rotate status , undefined will show not matter what roate is
            // isRotate: true,
                isHeightPower: true,
            // isSerialConnect: true,
            },
            disable: {
                isRotate: true,
                // isHeightPower: true,
                isSerialConnect: true,
            },
        },
        {
            name: '输入材料厚度',
            description: () => (
                <div className="">
                    <div>测量并输入材料厚度。机器将会依据输入的材料厚度，自动调整激光高度。</div>
                    <div className="sm-flex align-center margin-top-8">
                        <span className="">{i18n._('key-Workspace/LaserStartJob-3axis_start_job_material_thickness')}</span>
                        <Input
                            suffix="mm"
                            className="margin-left-16"
                            size="small"
                            value={materialThickness}
                            max={size.z - 40}
                            min={0}
                            onChange={onChangeMaterialThickness}
                        />
                    </div>
                </div>
            ),
            show: {
            // isRotate: true,
            // isHeightPower: false,
            // isSerialConnect: true,
            },
            disable: {
                // isRotate: true,
            // isHeightPower: true,
            // isSerialConnect: true,
            }
        },
        {
            name: '按机器设置原点（Manual Mode）',
            description: '手动控制执行头移动，直至激光光束在材料表面聚合成面积最小的光斑。点击开始作业，机器将会以当前高度作为激光高度。',
            show: {
            // isRotate: true,
            // isHeightPower: true,
            // isSerialConnect: true,
            },
            disable: false
        },

    ];




    return (
        <Modal
            centered
            visible={showStartModal}
            onClose={() => { props.onClose(); }}
            style={{ width: '50%' }}
            width="50%"
        >
            <Modal.Header>
                {i18n._('key-Workspace/LaserStartJob-start_job')}
            </Modal.Header>
            <Modal.Body>
                <Radio.Group
                    style={{ display: 'flex', flexDirection: 'column' }}
                    onChange={onChange}
                    value={selectedValue}
                >
                    {arry.map(v => {
                        console.log(v);
                        return (
                            <Radio
                                style={{ borderRadius: '100%', marginTop: '16px' }}
                                className="sm-flex-auto "
                                value={v.name}
                                disabled={handleDisable(v)}
                                // checked={isLaserPrintAutoMode}
                                // onChange={actions.onChangeLaserPrintMode}
                            >
                                <TipTrigger
                                    placement="right"
                                    title={i18n._('key-Workspace/WifiTransport/LaserStartModal-Disable reason')}
                                    content={handleDisable(v) && (<span>tips</span>)}
                                >
                                    <span className={handleDisable(v) ? 'heading-3 color-black-5' : 'heading-3'}> { v.name } {i18n._('key-Workspace/LaserStartJob-3axis_start_job_auto_mode')} </span>
                                </TipTrigger>
                                {v.name === selectedValue && (<div className=" margin-top-8">{typeof v.description === 'string' ? v.description : v.description()} </div>)}
                            </Radio>
                        );
                    })}
                </Radio.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button priority="level-three" width="88px" onClick={() => props.onClose()} className="margin-right-16">{i18n._('key-unused-Cancel')}</Button>
                <Button
                    priority="level-two"
                    type="primary"
                    width="88px"
                    onClick={() => { props.onConfirm(); props.onClose(); }}
                >
                    {i18n._('key-Workspace/LaserStartJob-button_start')}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}


LaserStartModal.propTypes = {
    showStartModal: PropTypes.bool.isRequired,
    isHeightPower: PropTypes.bool.isRequired,
    isRotate: PropTypes.bool.isRequired,
    isSerialConnect: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
};
export default LaserStartModal;
