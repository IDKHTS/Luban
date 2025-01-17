import React, { PureComponent } from 'react';
// import Sortable from 'react-sortablejs';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import i18next from 'i18next';
import { includes } from 'lodash';
import { longLang } from '../../constants';
import styles from './styles/project.styl';

class ProjectLayout extends PureComponent {
    static propTypes = {
        renderRightView: PropTypes.func,
        children: PropTypes.array,
        renderModalView: PropTypes.func,
        renderMainToolBar: PropTypes.func,
        renderSubToolBar: PropTypes.func
    };

    state = {
    };

    centerView = React.createRef();

    rightView = React.createRef();

    subToolBar = React.createRef();

    componentDidMount() {
        window.addEventListener('resize', this.resizeWindow, false);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resizeWindow, false);
    }

    resizeWindow = () => {
        const rightView = this.rightView.current;
        const subToolBar = this.subToolBar.current;
        const centerView = this.centerView.current;
        if (centerView) {
            centerView.style.width = `calc(100vw - ${rightView.clientWidth}px - ${subToolBar.clientWidth}px)`;
        }
    }

    render() {
        const { renderRightView, children, renderMainToolBar, renderSubToolBar, renderModalView } = this.props;
        return (
            <div>
                <div
                    className={classNames(
                        styles['main-bar'],
                        'clearfix'
                    )}
                >
                    {renderMainToolBar && (
                        renderMainToolBar()
                    )}
                </div>
                <div className={classNames(styles['content-flex'], includes(longLang, i18next.language) && styles['long-lang-content-height'])}>
                    <div
                        ref={this.rightView}
                        className={classNames(
                            styles.controls,
                            'overflow-x-hidden',
                            'border-radius-8',
                            styles['controls-right'],
                            'box-shadow-module'
                        )}
                    >
                        {renderRightView && (
                            renderRightView()
                        )}
                    </div>

                    <div
                        ref={this.centerView}
                        className={classNames(
                            styles.visualizer,
                        )}
                    >
                        {children}
                    </div>

                    <div
                        ref={this.subToolBar}
                        className={classNames(
                            styles['sub-bar'],
                        )}
                    >
                        {renderSubToolBar && (
                            renderSubToolBar()
                        )}
                    </div>

                    {renderModalView && (
                        renderModalView()
                    )}

                </div>
            </div>
        );
    }
}

export default ProjectLayout;
