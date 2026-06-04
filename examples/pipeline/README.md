"""CAIAO Example: Pipeline Demo (Composite Server)

Demonstrates a composite pipeline that chains multiple calculator operations.
The pipeline computes (a + b) * c as a single composite tool invocation.

Run:
    python -c "
    import asyncio
    from caiao.hub import CAIAOClientHub

    hub = CAIAOClientHub([{
        'name': 'calc_pipeline',
        'composite': True,
        'description': 'Compute (a + b) * c',
        'tools': [{'name': 'add'}, {'name': 'multiply'}],
        'input_schema': {
            'type': 'object',
            'properties': {
                'a': {'type': 'number'},
                'b': {'type': 'number'},
                'c': {'type': 'number'},
            },
        },
        'pipeline': [
            {'tool': 'add', 'input_map': {'a': 'a', 'b': 'b'}, 'map_result': 'sum'},
            {'tool': 'multiply', 'input_map': {'a': 'sum__result', 'b': 'c'}, 'map_result': 'final'},
        ],
    }])

    async def main():
        result = await hub.call_tool('calc_pipeline', {'a': 3, 'b': 4, 'c': 2})
        print(result)

    asyncio.run(main())
    "
"""
