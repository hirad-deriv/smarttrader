const QRCode           = require('davidshimjs-qrcodejs');
const Client           = require('../../../../base/client');
const BinarySocket     = require('../../../../base/socket');
const FormManager      = require('../../../../common/form_manager');
const getPropertyValue = require('../../../../../_common/utility').getPropertyValue;
const localize         = require('../../../../../_common/localize').localize;

const TwoFactorAuthentication = (() => {
    const form_id = '#frm_two_factor_auth';
    const state = ['disabled', 'enabled'];
    let current_state,
        next_state,
        qrcode; // eslint-disable-line

    const onLoad = () => {
        init();
    };

    const init = () => {
        BinarySocket.send({ account_security: 1, totp_action: 'status'}).then((res) => {
            $('#two_factor_loading').remove();

            if (res.error) {
                handleError('status', res.error.message);
                return;
            }

            current_state = state[res.account_security.totp.is_enabled];
            next_state    = state[+(!res.account_security.totp.is_enabled)].slice(0, -1);

            $(`#${current_state}`).setVisibility(1);
            $('#btn_submit').text(next_state);
            $(form_id).setVisibility(1);

            FormManager.init(form_id, [
                { selector: '#otp', validations: ['req', 'number'], request_field: 'otp', no_scroll: true },
                { request_field: 'account_security', value: 1 },
                { request_field: 'totp_action', value: next_state },
            ]);
            FormManager.handleSubmit({
                form_selector       : form_id,
                fnc_response_handler: handleSubmitResponse,
                enable_button       : true,
            });

            if (current_state === 'disabled') {
                $('.otp-form-group').css('padding-left', '60px');
                initQRCode();
            }
        });
    };

    const resetComponent = () => {
        $(`#${current_state}`).setVisibility(0);
        $(form_id).setVisibility(0);
        $('#qrcode').html('');
        $('.otp-form-group').css('padding-left', '');
        init();
    };

    const initQRCode = () => {
        BinarySocket.send({ account_security: 1, totp_action: 'generate'}).then((res) => {
            $('#qrcode_loading').setVisibility(0);

            if (res.error) {
                handleError('generate', res.error.message);
                return;
            }

            makeQrCode(res.account_security.totp.secret_key);
        });
    };

    const makeQrCode = (key) => {
        const text = `otpauth://totp/${Client.get('email')}?secret=${key}&issuer=Binary.com`;
        qrcode = new QRCode(document.getElementById('qrcode'), {
            text,
            width : 130,
            height: 130,
        });
    };

    const handleSubmitResponse = (res) => {
        if ('error' in res) {
            showFormMessage(getPropertyValue(res, ['error', 'message']) || 'Sorry, an error occurred while processing your request.');
        } else {
            $('#otp').val('');
            showFormMessage(`You have successfully ${next_state}d two-factor authentication for your account.`, true);
        }
    };

    const handleError = (id, err_msg) => {
        $(`#${id}_error`).setVisibility(1).text(localize(err_msg || localize('Sorry, an error occurred while processing your request.')));
    };

    const showFormMessage = (msg, is_success) => {
        $('#form_message')
            .attr('class', is_success ? 'success-msg' : 'error-msg')
            .html(is_success ? $('<ul/>', { class: 'checked' }).append($('<li/>', { text: localize(msg) })) : localize(msg))
            .css('display', 'block')
            .delay(3000)
            .fadeOut(1000, is_success? resetComponent: '');
    };

    return {
        onLoad,
    };
})();

module.exports = TwoFactorAuthentication;
