import * as path from 'path';
import * as os from 'os';
import * as sinon from 'sinon';
import * as fs from 'mz/fs';
import { expect } from 'chai';
import { FSUtils } from './../../src/FSUtils';
import * as link from '../../src/link';
const cmdShim = require('cmd-shim');

describe('link', () => {

    let sandbox: sinon.SinonSandbox;
    let platform: sinon.SinonStub;
    let symlink: sinon.SinonStub;
    let cmdShimIfExist: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        symlink = sandbox.stub(fs, 'symlink');
        cmdShimIfExist = sandbox.stub(cmdShim, 'ifExists');
        sandbox.stub(FSUtils, 'mkdirp').resolves(undefined);
        platform = sandbox.stub(os, 'platform');
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('when platform !== win32', () => {

        beforeEach(() => platform.returns('not win32'))

        it('should symlink', async () => {
            const to = 'some/path';
            await link.link(path.resolve('package.json'), to);
            expect(fs.symlink).to.have.been.calledWith(path.normalize('../package.json'), path.resolve(to), 'junction');
            expect(cmdShimIfExist).not.to.have.been.called;
        });

        it('should reject when `symlink` rejects', () => {
            const err = new Error('some error');
            symlink.rejects(err);
            return expect(link.link(path.resolve('package.json'), 'some/link')).to.be.rejectedWith(err);
        });
    });

    describe('when platform === win32', () => {
        beforeEach(() => platform.returns('win32'));

        it('should `cmdShim`', async () => {
            // Arrange
            const to = 'some/path';
            const from = path.resolve('package.json');

            // Act
            const linkingPromise = link.link(from, to);
            cmdShimIfExist.callArg(2);
            await linkingPromise;

            // Assert
            expect(fs.symlink).not.to.have.been.called;
            expect(cmdShimIfExist).calledWith(from, to);
        });

        it('should reject when `cmdShim` errors', () => {
            // Arrange
            const to = 'some/path';
            const from = path.resolve('package.json');
            const err = new Error('some error');

            // Act
            const linkingPromise = link.link(from, to);
            cmdShimIfExist.callArgWith(2, err);

            // Assert
            return expect(linkingPromise).rejectedWith(err);
        });
    });
});