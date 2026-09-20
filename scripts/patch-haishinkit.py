#!/usr/bin/env python3
"""Work around Swift 6.4's HaishinKit 1.9.3 initializer compiler crash.
Run after pod install; remove when the upstream initializer fix is available.
"""
from pathlib import Path
import re

path = Path(__file__).resolve().parents[1] / "ios/Pods/HaishinKit/Sources/IO/AudioNode.swift"
source = path.read_text()
for name in ("mixerComponentDescription", "outputComponentDescription"):
    pattern = rf"    private var {name} = AudioComponentDescription\([\s\S]*?componentFlagsMask: 0\)\n"
    match = re.search(pattern, source)
    if match:
        declaration = match.group().replace("    private var", "        var")
        source = source.replace(match.group(), "", 1)
        call = f"        try super.init(description: &{name})"
        assert source.count(call) == 1, f"Unexpected HaishinKit initializer: {name}"
        source = source.replace(call, declaration + call, 1)
    assert f"        var {name} = AudioComponentDescription(" in source
    assert f"private var {name}" not in source
path.chmod(path.stat().st_mode | 0o200)
path.write_text(source)
print("HaishinKit initializer workaround applied.")
