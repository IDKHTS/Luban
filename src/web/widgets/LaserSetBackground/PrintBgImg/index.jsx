import React, { PureComponent } from 'react';
import Slider from 'rc-slider';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import PropTypes from 'prop-types';
import i18n from '../../../lib/i18n';
import { BOUND_SIZE } from '../../../constants';
import { NumberInput as Input } from '../../../components/Input';
import controller from '../../../lib/controller';
import styles from '.././styles.styl';
import PrintingPreview from './PrintingPreview';


class PrintBgImg extends PureComponent {
    static propTypes = {
        state: PropTypes.shape({
            sideLength: PropTypes.number.isRequired
        }),
        actions: PropTypes.shape({
            changeSideLength: PropTypes.func.isRequired,
            checkConnectionStatus: PropTypes.func.isRequired
        })
    };

    state = {
        sideLengthPreviewed: 100,
        fixedPower: 100
    };

    actions = {
        printBgImg: () => {
            if (!this.props.actions.checkConnectionStatus()) {
                return;
            }
            const { sideLengthPreviewed, fixedPower } = this.state;
            this.props.actions.changeSideLength(sideLengthPreviewed);
            const gcodeStr = this.actions.generateSquareGcode(sideLengthPreviewed, fixedPower);
            pubsub.publish(
                'gcode:upload',
                {
                    gcode: gcodeStr
                }
            );
            setTimeout(() => {
                controller.command('gcode:start');
            }, 1000);
        },
        onChangeSideLengthPreviewed: (sideLengthPreviewed) => {
            this.setState({ sideLengthPreviewed });
        },
        onChangeFixedPower: (fixedPower) => {
            this.setState({ fixedPower });
        },
        generateSquareGcode: (sideLength, power) => {
            // M3: laser on
            // M5: laser off
            const gcodeArray = [];
            const workSpeed = 1500, jogSpeed = 1500;
            const p0 = {
                x: (BOUND_SIZE - sideLength) / 2,
                y: (BOUND_SIZE - sideLength) / 2
            };
            const p1 = {
                x: p0.x + sideLength,
                y: p0.y
            };
            const p2 = {
                x: p0.x + sideLength,
                y: p0.y + sideLength
            };
            const p3 = {
                x: p0.x,
                y: p0.y + sideLength
            };
            // power in percentage
            // priority: P > S, for compatibility, use both P and S args.
            const powerStrength = Math.floor(power * 255 / 100);

            gcodeArray.push(';Laser Square G-code Generated by Snapmakerjs.');
            gcodeArray.push(';powerPercent: ' + power);
            gcodeArray.push(';workSpeed: ' + workSpeed);

            gcodeArray.push(`G0 F${jogSpeed}`);
            gcodeArray.push(`G1 F${workSpeed}`);

            // move x&y to zero
            gcodeArray.push('G91');
            gcodeArray.push(`G0 X${-BOUND_SIZE}`);
            gcodeArray.push(`G0 Y${-BOUND_SIZE}`);

            gcodeArray.push('G90'); // absolute position
            gcodeArray.push('G21'); // set units to mm
            gcodeArray.push('G92 X0 Y0 Z0'); // set work origin

            gcodeArray.push(`G0 X${p0.x} Y${p0.y}`);
            // set M3 power
            gcodeArray.push(`M3 P${power} S${powerStrength}`);
            gcodeArray.push(`G1 X${p0.x} Y${p0.y}`);
            gcodeArray.push(`G1 X${p1.x} Y${p1.y}`);
            gcodeArray.push(`G1 X${p2.x} Y${p2.y}`);
            gcodeArray.push(`G1 X${p3.x} Y${p3.y}`);
            gcodeArray.push(`G1 X${p0.x} Y${p0.y}`);
            gcodeArray.push('M5');
            // push plate out & move laser head to left
            // convenient to take photo
            gcodeArray.push(`G0 X${-BOUND_SIZE}`);
            gcodeArray.push(`G0 Y${BOUND_SIZE}`);
            return gcodeArray.join('\n') + '\n';
        }
    };

    render() {
        const actions = { ...this.props.actions, ...this.actions };
        const state = { ...this.props.state, ...this.state };

        return (
            <React.Fragment>
                <div style={{ width: '100%', height: '100%' }}>
                    <PrintingPreview
                        sideLength={this.state.sideLengthPreviewed}
                    />
                    <div style={{ height: '100px', width: '400px', margin: '0 auto', padding: '10px' }}>
                        <div style={{ width: '100%' }}>
                            <table className={styles['parameter-table']} >
                                <tbody>
                                    <tr>
                                        <td>
                                            {i18n._('Side Length')}
                                        </td>
                                        <td style={{ width: '50%', paddingRight: '15px' }}>
                                            <Slider
                                                value={state.sideLengthPreviewed}
                                                min={40}
                                                max={120}
                                                onChange={actions.onChangeSideLengthPreviewed}
                                            />
                                        </td>
                                        <td style={{ width: '48px' }}>
                                            <Input
                                                value={state.sideLengthPreviewed}
                                                min={40}
                                                max={120}
                                                onChange={actions.onChangeSideLengthPreviewed}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            {i18n._('Fixed Power (%)')}
                                        </td>
                                        <td style={{ width: '50%', paddingRight: '15px' }}>
                                            <Slider
                                                value={state.fixedPower}
                                                min={1}
                                                max={100}
                                                onChange={actions.onChangeFixedPower}
                                            />
                                        </td>
                                        <td style={{ width: '48px' }}>
                                            <Input
                                                min={1}
                                                max={100}
                                                value={state.fixedPower}
                                                onChange={actions.onChangeFixedPower}
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div style={{ width: '400px', margin: '0 auto', paddingLeft: '20px', paddingRight: '20px' }}>
                        <button
                            type="button"
                            className={classNames(styles['btn-large'], styles['btn-primary'])}
                            onClick={actions.printBgImg}
                            style={{ width: '40%', float: 'left' }}
                        >
                            {i18n._('Print Square')}
                        </button>
                        <button
                            type="button"
                            className={classNames(styles['btn-large'], styles['btn-default'])}
                            onClick={actions.displayExtractTrace}
                            style={{ width: '40%', float: 'right' }}
                        >
                            {i18n._('Next')}
                        </button>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

export default PrintBgImg;

