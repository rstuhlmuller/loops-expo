"""Run with python3 scripts/test_patch_haishinkit.py; no installed Pods required."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    script = root / 'scripts/patch-haishinkit.py'
    script.parent.mkdir()
    shutil.copyfile(Path(__file__).with_name('patch-haishinkit.py'), script)
    target = root / 'ios/Pods/HaishinKit/Sources/IO/AudioNode.swift'
    target.parent.mkdir(parents=True)
    original = ''.join(
        f'class {kind}: AudioNode {{\n'
        f'    private var {name} = AudioComponentDescription(\n'
        '        componentFlagsMask: 0)\n'
        '    init() throws {\n'
        f'        try super.init(description: &{name})\n'
        '    }\n}\n'
        for kind, name in [('MixerNode', 'mixerComponentDescription'),
                           ('OutputNode', 'outputComponentDescription')]
    )
    target.write_text(original)
    subprocess.run([sys.executable, str(script)], check=True)
    patched = target.read_bytes()
    assert b'private var' not in patched
    assert patched.count(b'        var ') == 2
    subprocess.run([sys.executable, str(script)], check=True)
    assert target.read_bytes() == patched
    invalid = original.replace('&outputComponentDescription', '&unexpected')
    target.write_text(invalid)
    result = subprocess.run([sys.executable, str(script)], capture_output=True)
    assert result.returncode != 0
    assert target.read_text() == invalid
print('Patch, repeat application, and unexpected-source checks passed.')
